
# 1. Arquitetura do Módulo
Pasta raiz: `/question-bank`
- `/components`: Componentes visuais isolados (QuestionCard, FilterBar, ResolutionView).
- `/services`: Camada de comunicação com o Supabase (queries reais).
- `/types`: Definições de tipagem TypeScript estritas.
- `QuestionBankPanel.tsx`: Container principal (Smart Component) que gerencia o estado.

# 2. Estrutura das Novas Tabelas (SQL)
Ver arquivo `question-bank/schema.sql` para o DDL completo.
- `qb_questions`: Tabela mestre das questões.
- `qb_alternatives`: Alternativas (1:N).
- `qb_resolutions`: Resoluções detalhadas (1:1).
- `qb_student_answers`: Registro de respostas (Log).
- `qb_stats_cache`: Cache de estatísticas para performance.

# 3. Captura do ID do Aluno
O ID é capturado via `props` no componente `StudentDashboard` do arquivo `App.tsx`.
Não há nova autenticação. O componente `QuestionBankPanel` recebe `studentId={user.id}` diretamente do contexto existente.

# 4. Exemplo de Rota (Service) - Buscar Questões
```typescript
async function fetchQuestions(filters: QuestionFilters) {
  let query = supabase.from('qb_questions').select('*, qb_alternatives(*)');
  if (filters.subject) query = query.eq('subject', filters.subject);
  if (filters.board) query = query.eq('board', filters.board);
  return await query;
}
```

# 5. Exemplo de Rota (Service) - Registrar Resposta
```typescript
async function submitAnswer(userId: string, questionId: string, alternativeId: string) {
  return await supabase.from('qb_student_answers').insert({
    user_id: userId,
    question_id: questionId,
    selected_alternative_id: alternativeId,
    created_at: new Date().toISOString()
  });
}
```

# 6. JSON de Questão Completa
```json
{
  "id": "uuid-123",
  "statement": "Acerca dos direitos fundamentais...",
  "type": "ABCDE",
  "difficulty": "MEDIUM",
  "board": "CEBRASPE",
  "year": 2024,
  "alternatives": [
    {"id": "a1", "text": "Assertiva A", "is_correct": false},
    {"id": "a2", "text": "Assertiva B", "is_correct": true}
  ],
  "resolution": {
    "text": "A alternativa B está correta conforme art. 5º...",
    "legal_basis": "CF/88 Art 5, X",
    "video_url": "https://YT..."
  }
}
```

# 7. JSON de Estatísticas
```json
{
  "total_answered": 150,
  "accuracy_global": 0.78,
  "by_subject": {
    "Direito Constitucional": 0.85,
    "Português": 0.60
  },
  "weak_topics": ["Crase", "Controle de Constitucionalidade"]
}
```

# 8. Garantias de Isolamento
- Nenhuma tabela existente (`users`, `materials`, etc.) foi alterada.
- O CSS utiliza classes utilitárias do Tailwind já existentes ou estilos inline escopados.
- A lógica de login permanece intacta.
- O componente é renderizado condicionalmente apenas na nova aba.
