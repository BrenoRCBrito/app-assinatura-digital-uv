import { createInMemoryCursorRepository } from '../inMemory/inMemoryCursorRepository';
import { testarContratoCursorRepository } from '../testing/cursorRepositoryContract';

testarContratoCursorRepository('em memória', createInMemoryCursorRepository);
