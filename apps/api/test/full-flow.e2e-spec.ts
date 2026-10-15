/**
 * End-to-end test celého vertikálního průchodu přes HTTP API:
 * neznámý (fiktivní) dodavatel → web + PDF/DOCX/XLSX → serverový import → review faktů →
 * kapitoly a otázky → publikace → student odpovídá → restart aplikace → progres zůstává.
 */
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { mkdtempSync, rmSync } from 'node:fs';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { ImportsService } from '../src/modules/imports/imports.service';
import { makeDocx, makePdf, makeXlsx } from './fixtures/documents';
import { startSupplierSite } from './fixtures/supplier-site';

interface AdminChapter {
  id: string;
  number: number;
  question: { id: string; correctIndex: number; status: string } | null;
}

const dataDir = mkdtempSync(join(tmpdir(), 'valxon-e2e-'));

/** Vytvoří instanci aplikace nad stejným datovým adresářem (simulace restartu). */
async function createApp(): Promise<INestApplication> {
  Object.assign(process.env, {
    DATA_DIR: dataDir,
    DATABASE_PATH: join(dataDir, 'e2e.sqlite'),
    IMPORT_ALLOW_PRIVATE_HOSTS: 'true',
    IMPORT_REQUEST_DELAY_MS: '0',
    DEV_LOGIN_ENABLED: 'true',
    AI_PROVIDER: '',
  });
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return app;
}

describe('VALXON Academy – celý průchod', () => {
  let app: INestApplication;
  let site: Awaited<ReturnType<typeof startSupplierSite>>;
  let adminToken = '';
  let studentToken = '';
  let supplierId = '';
  let slug = '';

  const http = (): Server => app.getHttpServer() as Server;
  const asAdmin = (req: request.Test): request.Test => req.set('Authorization', `Bearer ${adminToken}`);
  const asStudent = (req: request.Test): request.Test => req.set('Authorization', `Bearer ${studentToken}`);
  const login = async (role: string): Promise<string> => (await request(http()).post('/api/auth/dev-login').send({ role }).expect(200)).body.token as string;

  beforeAll(async () => {
    site = await startSupplierSite();
    app = await createApp();
    adminToken = await login('admin');
    studentToken = await login('student');
  });

  afterAll(async () => {
    await app?.close();
    site?.server.close();
    rmSync(dataDir, { recursive: true, force: true });
  });

  it('role se kontrolují na serveru', async () => {
    await request(http()).get('/api/admin/suppliers').expect(401);
    await asStudent(request(http()).get('/api/admin/suppliers')).expect(403);
    await asAdmin(request(http()).get('/api/admin/suppliers')).expect(200);
  });

  it('správce založí neznámého dodavatele s URL, bestsellery a dokumenty', async () => {
    const created = await asAdmin(request(http()).post('/api/admin/suppliers'))
      .send({ name: 'Nordlicht Werbetextil', websiteUrl: site.url, bestsellers: [{ name: 'Jute Shopper', sku: 'NL-100' }, { name: 'Beach Towel', url: `${site.url}products/item-3` }] })
      .expect(201);
    supplierId = created.body.id;
    slug = created.body.slug;
    expect(created.body.status).toBe('draft');

    const pdf = await makePdf(['Nordlicht catalogue 2026', 'Minimum order quantity: 250 pcs for printed towels.']);
    const docx = await makeDocx(['Our vision is that every promotional bag is used for years.', 'Samples are free for orders above 500 pieces.']);
    const xlsx = await makeXlsx([['Name', 'SKU', 'Category', 'Material', 'Purchase price EUR'], ['Jute Shopper', 'NL-100', 'Bags', 'Jute', 1.25], ['Guest Towel', 'NL-104', 'Towels', 'Organic cotton', 2.4]]);
    const upload = await asAdmin(request(http()).post(`/api/admin/suppliers/${supplierId}/sources/files`))
      .attach('files', pdf, 'katalog.pdf')
      .attach('files', docx, 'podminky.docx')
      .attach('files', xlsx, 'produkty.xlsx')
      .expect(201);
    expect(upload.body.map((s: { kind: string }) => s.kind).sort()).toEqual(['docx', 'pdf', 'xlsx']);

    // Podvržený soubor se odmítne celý.
    await asAdmin(request(http()).post(`/api/admin/suppliers/${supplierId}/sources/files`)).attach('files', Buffer.from('MZ fake'), 'katalog.pdf').expect(400);
  });

  it('import skutečně stáhne web (s respektem k robots.txt) a zpracuje dokumenty', async () => {
    const started = await asAdmin(request(http()).post(`/api/admin/suppliers/${supplierId}/imports`)).expect(201);
    await app.get(ImportsService).waitFor(started.body.id);
    const job = (await asAdmin(request(http()).get(`/api/admin/imports/${started.body.id}`)).expect(200)).body;

    expect(job.status).toBe('completed_with_errors'); // zakázaná stránka z robots.txt je pravdivě v reportu
    expect(job.report.pagesFetched).toBeGreaterThanOrEqual(4);
    expect(job.report.failedUrls.some((f: { url: string }) => f.url.includes('/private/'))).toBe(true);
    expect(site.requested).not.toContain('/private/about-internal');
    expect(job.report.ai.status).toBe('unavailable');
    expect(job.report.conflicts.some((c: { kind: string }) => c.kind === 'moq')).toBe(true);

    const facts = (await asAdmin(request(http()).get(`/api/admin/suppliers/${supplierId}/facts`)).expect(200)).body as { kind: string; value: string; location: string; status: string }[];
    expect(facts.every((f) => f.status === 'proposed')).toBe(true);
    expect(facts.find((f) => f.kind === 'moq' && f.value === '100 pieces')?.location).toContain('/faq');
    expect(facts.find((f) => f.kind === 'moq' && f.value === '250 pcs')?.location).toBe('katalog.pdf, str. 2');
    expect(facts.find((f) => f.kind === 'founded')?.value).toBe('2004');
    expect(facts.find((f) => f.kind === 'headquarters')?.value).toBe('Německo');
    expect(facts.some((f) => f.kind === 'vision' && f.location === 'podminky.docx, odst. 1')).toBe(true);
    expect(facts.filter((f) => f.kind === 'category').map((f) => f.value)).toEqual(expect.arrayContaining(['Bags', 'Towels']));

    // Ceny z XLSX se nikam neuložily.
    const sources = (await asAdmin(request(http()).get(`/api/admin/suppliers/${supplierId}/sources`)).expect(200)).body as { id: string; kind: string; warnings: string[] }[];
    const xlsxSource = sources.find((s) => s.kind === 'xlsx')!;
    expect(xlsxSource.warnings.join(' ')).toContain('cenové sloupce');
    const segments = (await asAdmin(request(http()).get(`/api/admin/sources/${xlsxSource.id}/segments`)).expect(200)).body as { text: string }[];
    expect(segments.map((s) => s.text).join(' ')).not.toMatch(/1\.25|2\.4|price/i);

    // Bestsellery: SKU i URL spárované, nic nebylo označeno za bestseller automaticky.
    const products = (await asAdmin(request(http()).get(`/api/admin/suppliers/${supplierId}/products`)).expect(200)).body as { listType: string; matchStatus: string; inputName: string; imageUrl: string | null }[];
    const bestsellers = products.filter((p) => p.listType === 'bestseller');
    expect(bestsellers).toHaveLength(2);
    expect(bestsellers.map((p) => [p.inputName, p.matchStatus])).toEqual([['Jute Shopper', 'matched'], ['Beach Towel', 'matched']]);
    expect(bestsellers.find((p) => p.inputName === 'Beach Towel')?.imageUrl).toContain('/img/p3.jpg');
  });

  it('nepublikovaného dodavatele student nevidí a publikace bez schválení selže', async () => {
    await asStudent(request(http()).get(`/api/learn/suppliers/${slug}`)).expect(404);
    const res = await asAdmin(request(http()).post(`/api/admin/suppliers/${supplierId}/publish`)).expect(400);
    expect(res.body.problems.length).toBeGreaterThan(0);
  });

  it('správce ověří fakta, upraví a schválí 7 kapitol a otázky a publikuje', async () => {
    const facts = (await asAdmin(request(http()).get(`/api/admin/suppliers/${supplierId}/facts`))).body as { id: string; kind: string }[];
    // Jeden fakt zamítneme – student ho nesmí vidět.
    const samples = facts.filter((f) => f.kind === 'samples');
    await asAdmin(request(http()).patch('/api/admin/facts/bulk-status')).send({ ids: samples.map((f) => f.id), status: 'rejected' }).expect(200);
    const rest = facts.filter((f) => f.kind !== 'samples').map((f) => f.id);
    await asAdmin(request(http()).patch('/api/admin/facts/bulk-status')).send({ ids: rest, status: 'verified' }).expect(200);

    const chapters = (await asAdmin(request(http()).get(`/api/admin/suppliers/${supplierId}/chapters`)).expect(200)).body as AdminChapter[];
    expect(chapters.map((c) => c.number)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    // Generátor navrhl otázky jen tam, kde jsou fakta (1, 2, 3, 5, 6).
    expect(chapters.filter((c) => c.question).map((c) => c.number)).toEqual([1, 2, 3, 5, 6]);

    for (const chapter of chapters) {
      await asAdmin(request(http()).patch(`/api/admin/chapters/${chapter.id}`)).send({ lead: `Úvod kapitoly ${chapter.number}.`, body: `## Shrnutí\n- Bod kapitoly ${chapter.number}` }).expect(200);
      await asAdmin(request(http()).post(`/api/admin/chapters/${chapter.id}/approve`)).expect(200);
      if (!chapter.question) {
        await asAdmin(request(http()).put(`/api/admin/chapters/${chapter.id}/question`))
          .send({ prompt: `Kontrolní otázka ${chapter.number}?`, options: ['Ano', 'Ne', 'Nevím'], correctIndex: 0, explanation: 'Vysvětlení odpovědi.' })
          .expect(200);
      }
      await asAdmin(request(http()).post(`/api/admin/chapters/${chapter.id}/question/approve`)).expect(200);
    }

    const published = await asAdmin(request(http()).post(`/api/admin/suppliers/${supplierId}/publish`)).expect(200);
    expect(published.body.status).toBe('published');
  });

  it('student vidí jen schválený obsah bez správných odpovědí a interních údajů', async () => {
    const res = await asStudent(request(http()).get(`/api/learn/suppliers/${slug}`)).expect(200);
    const json = JSON.stringify(res.body);
    expect(res.body.chapters).toHaveLength(7);
    expect(res.body.progress).toMatchObject({ completed: 0, total: 7, percent: 0 });
    expect(json).not.toContain('correctIndex');
    expect(json).not.toContain('adminNotes');
    expect(json).not.toContain('10 EUR per piece'); // zamítnutý fakt
    expect(json).not.toContain('katalog.pdf'); // interní dokumenty se studentovi neodkazují
    expect(res.body.location).toMatchObject({ countryCode: 'DE', countryName: 'Německo' });
    expect(res.body.chapters[3].title).toBe('TOP 2 bestsellerů');
  });

  it('pravidlo B: odeslání (i špatné) odpovědi dokončí kapitolu a progres přežije restart', async () => {
    const adminChapters = (await asAdmin(request(http()).get(`/api/admin/suppliers/${supplierId}/chapters`))).body as AdminChapter[];
    const ch1 = adminChapters[0];
    const wrong = (ch1.question!.correctIndex + 1) % 4;

    // Otevření kapitoly nic nemění.
    await asStudent(request(http()).get(`/api/learn/suppliers/${slug}`)).expect(200);
    const first = await asStudent(request(http()).post(`/api/learn/chapters/${ch1.id}/answer`)).send({ questionId: ch1.question!.id, selectedIndex: wrong }).expect(200);
    expect(first.body.answer).toMatchObject({ isCorrect: false, correctIndex: ch1.question!.correctIndex, attempts: 1 });
    expect(first.body.progress).toMatchObject({ completed: 1, percent: 14, completedChapterNumbers: [1] });

    // Opakované odeslání nevytvoří duplicitu ani další krok progresu.
    const retry = await asStudent(request(http()).post(`/api/learn/chapters/${ch1.id}/answer`)).send({ questionId: ch1.question!.id, selectedIndex: ch1.question!.correctIndex }).expect(200);
    expect(retry.body.answer).toMatchObject({ isCorrect: true, attempts: 2 });
    expect(retry.body.progress.completed).toBe(1);

    // Odpověď na neaktuální otázku se nezapočítá.
    await asStudent(request(http()).post(`/api/learn/chapters/${adminChapters[1].id}/answer`)).send({ questionId: ch1.question!.id, selectedIndex: 0 }).expect(409);

    // Restart aplikace nad stejnou databází – progres i publikace zůstávají.
    await app.close();
    app = await createApp();
    studentToken = await login('student');
    const after = await asStudent(request(http()).get(`/api/learn/suppliers/${slug}`)).expect(200);
    expect(after.body.progress).toMatchObject({ completed: 1, total: 7 });
    expect(after.body.chapters[0].answer).toMatchObject({ isCorrect: true, attempts: 2 });

    // Dokončení všech kapitol = 7/7 (certifikát se tím nevydává – žádný takový endpoint neexistuje).
    for (const chapter of adminChapters.slice(1)) {
      await asStudent(request(http()).post(`/api/learn/chapters/${chapter.id}/answer`)).send({ questionId: chapter.question?.id ?? (await currentQuestionId(chapter.id)), selectedIndex: 0 }).expect(200);
    }
    const final = await asStudent(request(http()).get(`/api/learn/suppliers/${slug}`)).expect(200);
    expect(final.body.progress).toMatchObject({ completed: 7, percent: 100 });
  });

  /** ID aktuální schválené otázky kapitoly (pro ručně doplněné otázky). */
  async function currentQuestionId(chapterId: string): Promise<string> {
    const res = await asStudent(request(http()).get(`/api/learn/suppliers/${slug}`));
    return (res.body.chapters as { id: string; question: { id: string } }[]).find((c) => c.id === chapterId)!.question.id;
  }
});
