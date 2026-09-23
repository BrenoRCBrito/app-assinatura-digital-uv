import React, { useEffect, useState } from 'react';

import { Card, IconButton, LoadingIndicator, Row, Screen, Section, Stack, Text } from '../../components';
import { formatarCpf, formatarTelefone, type Usuario } from '../../domain/usuario';
import { useAuthentication } from '../../hooks/useAuthentication';
import { useRepositories } from '../../storage/RepositoriesProvider';
import { CpfDialog } from './CpfDialog';
import { EmailDialog } from './EmailDialog';
import { SenhaDialog } from './SenhaDialog';
import { TelefoneDialog } from './TelefoneDialog';

type CampoEmEdicao = 'email' | 'senha' | 'cpf' | 'telefone' | null;

export function ProfileScreen() {
  const { usuarios } = useRepositories();
  const { usuarioId } = useAuthentication();

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [campoEmEdicao, setCampoEmEdicao] = useState<CampoEmEdicao>(null);

  useEffect(() => {
    let ativo = true;
    if (usuarioId === null) {
      setCarregando(false);
      return;
    }
    usuarios.findById(usuarioId).then((encontrado) => {
      if (!ativo) {
        return;
      }
      setUsuario(encontrado);
      setCarregando(false);
    });
    return () => {
      ativo = false;
    };
  }, [usuarioId, usuarios]);

  if (carregando || usuario === null) {
    return (
      <Screen preset="centered">
        <LoadingIndicator />
      </Screen>
    );
  }

  function linha(label: string, valor: string, onEditar: () => void) {
    return (
      <Row align="center" justify="between">
        <Stack gap="text">
          <Text preset="sectionLabel">{label}</Text>
          <Text preset="itemTitle">{valor}</Text>
        </Stack>
        <IconButton icon="edit" label={`Editar ${label.toLowerCase()}`} onPress={onEditar} />
      </Row>
    );
  }

  return (
    <Screen preset="scroll">
      <Section label="Dados da conta">
        <Card>
          <Stack gap="list">
            {linha('E-mail', usuario.email, () => setCampoEmEdicao('email'))}
            {linha('Senha', '••••••••', () => setCampoEmEdicao('senha'))}
            {linha('CPF', usuario.cpf === null ? 'Não informado' : formatarCpf(usuario.cpf), () =>
              setCampoEmEdicao('cpf'),
            )}
            {linha('Telefone', usuario.telefone === null ? 'Não informado' : formatarTelefone(usuario.telefone), () =>
              setCampoEmEdicao('telefone'),
            )}
          </Stack>
        </Card>
      </Section>

      <EmailDialog
        visible={campoEmEdicao === 'email'}
        usuario={usuario}
        onClose={() => setCampoEmEdicao(null)}
        onSaved={setUsuario}
      />
      <SenhaDialog
        visible={campoEmEdicao === 'senha'}
        usuario={usuario}
        onClose={() => setCampoEmEdicao(null)}
        onSaved={setUsuario}
      />
      <CpfDialog
        visible={campoEmEdicao === 'cpf'}
        usuario={usuario}
        onClose={() => setCampoEmEdicao(null)}
        onSaved={setUsuario}
      />
      <TelefoneDialog
        visible={campoEmEdicao === 'telefone'}
        usuario={usuario}
        onClose={() => setCampoEmEdicao(null)}
        onSaved={setUsuario}
      />
    </Screen>
  );
}
