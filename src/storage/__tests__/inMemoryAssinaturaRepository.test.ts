import { createInMemoryAssinaturaRepository } from '../inMemory/inMemoryAssinaturaRepository';
import { testarContratoAssinaturaRepository } from '../testing/assinaturaRepositoryContract';

testarContratoAssinaturaRepository('em memória', createInMemoryAssinaturaRepository);
