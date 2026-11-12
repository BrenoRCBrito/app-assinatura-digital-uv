import { criarCodigoCurto } from '../../domain/codigoCurto';
import { ServidorIndisponivel } from '../../services/apiDeDocumentos';
import { validarCodigoLido } from '../validarCodigoLido';

function criarDependencias() {
  return {
    consultarCodigo: jest.fn().mockResolvedValue({ tipo: 'naoEncontrado' }),
    conferirCodigoAntigo: jest.fn().mockResolvedValue({ tipo: 'adulterado' }),
  };
}

describe('validarCodigoLido', () => {
  test('código curto, digitado em minúsculas e com espaços, é consultado normalizado', async () => {
    const dependencias = criarDependencias();

    await expect(validarCodigoLido(dependencias, ' 7k3f-9qxz m2p4\n')).resolves.toEqual({ tipo: 'naoEncontrado' });
    expect(dependencias.consultarCodigo).toHaveBeenCalledWith(criarCodigoCurto('7K3F9QXZM2P4'));
    expect(dependencias.conferirCodigoAntigo).not.toHaveBeenCalled();
  });

  test('código AA1 de um PDF antigo vai para a conferência do código antigo', async () => {
    const dependencias = criarDependencias();

    await expect(validarCodigoLido(dependencias, '  AA1;id=1757680000000#carimbo ')).resolves.toEqual({
      tipo: 'adulterado',
    });
    expect(dependencias.conferirCodigoAntigo).toHaveBeenCalledWith('AA1;id=1757680000000#carimbo');
    expect(dependencias.consultarCodigo).not.toHaveBeenCalled();
  });

  test('texto que não é código do AssinaAqui é ilegível e não chega à API', async () => {
    const dependencias = criarDependencias();

    await expect(validarCodigoLido(dependencias, 'https://exemplo.com/documento')).resolves.toEqual({
      tipo: 'ilegivel',
    });
    expect(dependencias.consultarCodigo).not.toHaveBeenCalled();
    expect(dependencias.conferirCodigoAntigo).not.toHaveBeenCalled();
  });

  test('servidor indisponível chega a quem chamou', async () => {
    const dependencias = criarDependencias();
    dependencias.consultarCodigo.mockRejectedValue(new ServidorIndisponivel());

    await expect(validarCodigoLido(dependencias, '7K3F-9QXZ-M2P4')).rejects.toBeInstanceOf(ServidorIndisponivel);
  });
});
