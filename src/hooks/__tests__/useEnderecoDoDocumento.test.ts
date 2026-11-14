import { renderHook, waitFor } from '@testing-library/react-native';

import { createCity, createLatitude, createLongitude, type LocalAssinatura } from '../../domain/documento';
import { createEndereco } from '../../domain/endereco';
import { consultarEnderecoDoLocal } from '../../services/location';
import { useEnderecoDoDocumento } from '../useEnderecoDoDocumento';

jest.mock('../../services/location', () => ({ consultarEnderecoDoLocal: jest.fn() }));

const COORDENADAS = { latitude: createLatitude(-22.40418), longitude: createLongitude(-43.66283) };
const ANTIGO: LocalAssinatura = { coordenadas: COORDENADAS, cidade: createCity('Vassouras'), endereco: null };

describe('useEnderecoDoDocumento', () => {
  beforeEach(() => {
    jest.mocked(consultarEnderecoDoLocal).mockReset();
  });

  test('usa o endereço gravado na assinatura, sem consultar nada', async () => {
    const local = { ...ANTIGO, endereco: createEndereco('Rua das Flores, 123 - Centro, Vassouras - RJ') };

    const { result } = await renderHook(() => useEnderecoDoDocumento(local));

    expect(result.current).toBe('Rua das Flores, 123 - Centro, Vassouras - RJ');
    expect(consultarEnderecoDoLocal).not.toHaveBeenCalled();
  });

  test('documento antigo consulta o endereço pelas coordenadas', async () => {
    jest.mocked(consultarEnderecoDoLocal).mockResolvedValue(createEndereco('Rua A, Vassouras - RJ'));

    const { result } = await renderHook(() => useEnderecoDoDocumento(ANTIGO));

    await waitFor(() => expect(result.current).toBe('Rua A, Vassouras - RJ'));
    expect(consultarEnderecoDoLocal).toHaveBeenCalledWith(COORDENADAS);
  });

  test('enquanto o documento carrega, não há endereço nem consulta', async () => {
    const { result } = await renderHook(() => useEnderecoDoDocumento(null));

    expect(result.current).toBeNull();
    expect(consultarEnderecoDoLocal).not.toHaveBeenCalled();
  });

  test('documento antigo sem endereço na consulta fica sem endereço', async () => {
    jest.mocked(consultarEnderecoDoLocal).mockResolvedValue(null);

    const { result } = await renderHook(() => useEnderecoDoDocumento(ANTIGO));

    await waitFor(() => expect(consultarEnderecoDoLocal).toHaveBeenCalledTimes(1));
    expect(result.current).toBeNull();
  });
});
