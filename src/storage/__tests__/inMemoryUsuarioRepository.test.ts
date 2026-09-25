import { createInMemoryUsuarioRepository } from '../inMemory/inMemoryUsuarioRepository';
import { testarContratoUsuarioRepository } from '../testing/usuarioRepositoryContract';

testarContratoUsuarioRepository('em memória', createInMemoryUsuarioRepository);
