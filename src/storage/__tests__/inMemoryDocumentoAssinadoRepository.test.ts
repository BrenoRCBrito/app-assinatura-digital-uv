import { createInMemoryDocumentoAssinadoRepository } from '../inMemory/inMemoryDocumentoAssinadoRepository';
import { testarContratoDocumentoAssinadoRepository } from '../testing/documentoAssinadoRepositoryContract';

testarContratoDocumentoAssinadoRepository('em memória', createInMemoryDocumentoAssinadoRepository);
