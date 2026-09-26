import React, { useEffect, useState } from 'react';

import { Avatar ,Card, IconButton, LoadingIndicator, Row, Screen, Section, Stack, Text } from '../../components';
import { formatarCpf, formatarTelefone, type Usuario } from '../../domain/usuario';
import { useAuthentication } from '../../hooks/useAuthentication';
import { useRepositories } from '../../storage/RepositoriesProvider';
import { CpfDialog } from './CpfDialog';
import { EmailDialog } from './EmailDialog';
import { FotoPerfilDialog } from './FotoPerfilDialog'; 
import { SenhaDialog } from './SenhaDialog';
import { TelefoneDialog } from './TelefoneDialog';
import { NomeDialog } from './NomeDialog';


type CampoEmEdicao = 'nome' |'email' | 'senha' | 'cpf' | 'telefone'| 'foto' | null;

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
    <Stack gap="block">
      <Section label="Foto" preset='centered'>
        <Stack align="center">
          <Avatar fotoBase64={usuario.foto} onEditar={() => setCampoEmEdicao('foto')} />
        </Stack>
      </Section>

      <Section label="Dados da conta" preset="centered">
        <Card>
          <Stack gap="list">
            {linha('Nome', usuario.nome ?? 'Não informado', () => setCampoEmEdicao('nome'))}
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
     </Stack>
      <NomeDialog
        visible={campoEmEdicao === 'nome'}
        usuario={usuario}
        onClose={() => setCampoEmEdicao(null)}
        onSaved={setUsuario}
      />
      
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
      <FotoPerfilDialog
        visible={campoEmEdicao === 'foto'}
        usuario={usuario}
        onClose={() => setCampoEmEdicao(null)}
        onSaved={setUsuario}
      />

    </Screen>
  );
}
