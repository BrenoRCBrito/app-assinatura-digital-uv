import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthentication } from '../../hooks/useAuthentication';

import { AssinaturaItem, Button, confirmDestructive, List, Screen, showError } from '../../components';
import type { Assinatura } from '../../domain/assinatura';
import { useRepositories } from '../../storage/RepositoriesProvider';

type AssinaturasScreenProps = Readonly<{
  onNovaAssinatura: () => void;
}>;

export function AssinaturasScreen({ onNovaAssinatura }: AssinaturasScreenProps) {
  const { assinaturas: repositorio } = useRepositories();
  const [assinaturas, setAssinaturas] = useState<readonly Assinatura[]>([]);
  const [carregando, setCarregando] = useState(true);
  const { usuarioId } = useAuthentication();
  
  const carregar = useCallback(async () => {
  if (usuarioId === null) {
    return;
  }
  setCarregando(true);
  try {
    setAssinaturas(await repositorio.list(usuarioId));
  } catch (error) {
    console.error('Falha ao carregar as assinaturas:', error);
    setAssinaturas([]);
    showError('Erro', 'Não foi possível carregar os dados.');
  } finally {
    setCarregando(false);
  }
}, [repositorio, usuarioId]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar]),
  );

  async function excluir(assinatura: Assinatura) {
    try {
      await repositorio.delete(assinatura.id);
      await carregar();
    } catch (error) {
      console.error('Falha ao excluir a assinatura:', error);
      showError('Erro', 'Não foi possível excluir a assinatura.');
    }
  }

  function confirmarExclusao(assinatura: Assinatura) {
    confirmDestructive({
      title: 'Excluir assinatura',
      message: `Excluir "${assinatura.nome}"? Documentos já assinados não mudam.`,
      confirmLabel: 'Excluir',
      onConfirm: () => {
        void excluir(assinatura);
      },
    });
  }

  return (
    <Screen preset="list" footer={<Button label="Nova assinatura" icon="plus" onPress={onNovaAssinatura} />}>
      <List
        items={assinaturas}
        keyOf={(assinatura) => assinatura.id}
        loading={carregando}
        emptyMessage="Nenhuma assinatura salva. Toque em Nova assinatura para desenhar a primeira."
        renderItem={(assinatura) => (
          <AssinaturaItem assinatura={assinatura} onExcluir={() => confirmarExclusao(assinatura)} />
        )}
      />
    </Screen>
  );
}
