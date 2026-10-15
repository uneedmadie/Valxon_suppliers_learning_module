/**
 * Testy generátoru návrhů otázek – správná odpověď vždy odpovídá faktu.
 */
import { generateQuestion, QuestionFact } from './question-generator';

const fact = (kind: QuestionFact['kind'], value: string, status: QuestionFact['status'] = 'verified'): QuestionFact => ({ id: `${kind}-${value}`, kind, value, location: 'https://acme.test/', status });

describe('generateQuestion', () => {
  it('kapitola 1: země sídla jako správná odpověď', () => {
    const q = generateQuestion(1, 'Acme', [fact('headquarters', 'Utrecht, Nizozemsko')])!;
    expect(q.options[q.correctIndex]).toBe('Nizozemsko');
    expect(new Set(q.options).size).toBe(4);
    expect(q.factId).toBe('headquarters-Utrecht, Nizozemsko');
  });

  it('kapitola 2: rok založení', () => {
    const q = generateQuestion(2, 'Acme', [fact('founded', '2004')])!;
    expect(q.options[q.correctIndex]).toBe('2004');
  });

  it('kapitola 6: MOQ s jednotkou', () => {
    const q = generateQuestion(6, 'Acme', [fact('moq', '250 pieces')])!;
    expect(q.options[q.correctIndex]).toBe('250 pieces');
    expect(q.options).toContain('1250 pieces');
  });

  it('preferuje ověřený fakt a ignoruje zamítnutý', () => {
    const q = generateQuestion(2, 'Acme', [fact('founded', '1999', 'rejected'), fact('founded', '2010', 'proposed'), fact('founded', '2004')])!;
    expect(q.options[q.correctIndex]).toBe('2004');
  });

  it('bez faktů nevymýšlí otázku', () => {
    expect(generateQuestion(1, 'Acme', [])).toBeNull();
    expect(generateQuestion(7, 'Acme', [fact('moq', '1 ks')])).toBeNull();
  });
});
