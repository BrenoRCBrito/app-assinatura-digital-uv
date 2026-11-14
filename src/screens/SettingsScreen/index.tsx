import React, { useState } from 'react';

import {
  Button,
  Card,
  confirmDestructive,
  Screen,
  Section,
  SegmentedControl,
  showError,
  showSuccess,
  Stack,
  TextField,
  ToggleRow,
  type SegmentOption,
} from '../../components';
import type { GestureEngine, ThemeName } from '../../domain/settings';
import { useAuthentication } from '../../hooks/useAuthentication';
import { useSalvarEnderecoDaApi } from '../../hooks/useEnderecoDaApi';
import { enderecoAutomatico } from '../../services/apiDeDocumentos';
import { excluirTodasAsPastasDeArquivos } from '../../services/fileSystem';
import { ehModoDesenvolvedor } from '../../services/modoDesenvolvedor';
import { useRepositories } from '../../storage/RepositoriesProvider';
import { useSettings } from '../../storage/SettingsProvider';

const THEME_OPTIONS: readonly SegmentOption<ThemeName>[] = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
];

const EXEMPLO_DE_ENDERECO = 'http://192.168.0.10:3000';

const GESTURE_ENGINE_OPTIONS: readonly SegmentOption<GestureEngine>[] = [
  { value: 'panResponder', label: 'PanResponder' },
  { value: 'reanimated', label: 'Reanimated' },
];

export function SettingsScreen() {
  const { settings, updateSettings } = useSettings();
  const { assinaturas, cursores, documentos, usuarios } = useRepositories();
  const { sair } = useAuthentication();
  const [endereco, setEndereco] = useState(settings.enderecoDaApi ?? '');
  const salvarEnderecoDaApi = useSalvarEnderecoDaApi();
  const modoDesenvolvedor = ehModoDesenvolvedor();

  function salvarEndereco() {
    const resultado = salvarEnderecoDaApi(endereco);
    if (resultado.ok) {
      showSuccess('Endereço da API salvo.');
    } else {
      showError('Endereço inválido', resultado.mensagem);
    }
  }

  async function limparDados() {
    try {
      // Primeiro sai da conta (que envia o que falta e pergunta se algo não subiu); se a pessoa desistir, nada é apagado.
      if (!(await sair())) {
        return;
      }
      // Depois limpa o que sobrou, inclusive de outras contas e o cursor de sincronização.
      await assinaturas.clear();
      await documentos.clear();
      await usuarios.clear();
      await cursores.clear();
      excluirTodasAsPastasDeArquivos();
      updateSettings({
        loginBiometricoAtivado: false,
        perguntaBiometriaRespondida: false,
        ultimoUsuarioIdBiometria: null,
      });
      showSuccess('Dados do app apagados.');
    } catch (error) {
      console.error('Falha ao limpar os dados do app:', error);
      showError('Erro', 'Não foi possível limpar os dados.');
    }
  }

  function confirmarLimpeza() {
    confirmDestructive({
      title: 'Limpar dados do app',
      message: 'Apaga as assinaturas, os documentos e as contas deste aparelho. Não dá para desfazer.',
      confirmLabel: 'Limpar',
      onConfirm: () => {
        void limparDados();
      },
    });
  }

  return (
    <Screen preset="scroll">
      <Stack gap="block">
        <Section label="Aparência">
          <Card title="Tema" description="Muda as cores do app. Documentos e PDFs continuam em papel claro.">
            <SegmentedControl
              options={THEME_OPTIONS}
              selected={settings.theme}
              onSelect={(themeName) => updateSettings({ theme: themeName })}
            />
          </Card>
        </Section>

        <Section label="Gestos">
          <Card title="Motor de gestos" description="Define como o selo é arrastado sobre o documento.">
            <SegmentedControl
              options={GESTURE_ENGINE_OPTIONS}
              selected={settings.gestureEngine}
              onSelect={(gestureEngine) => updateSettings({ gestureEngine })}
            />
          </Card>
        </Section>

        <Section label="Digitalização">
          <ToggleRow
            title="Salvar cópia na galeria"
            description="Guarda a foto original do documento nas suas fotos."
            value={settings.salvarCopiaNaGaleria}
            onValueChange={(salvarCopiaNaGaleria) => updateSettings({ salvarCopiaNaGaleria })}
          />
        </Section>

        {modoDesenvolvedor ? (
          <>
            <Section label="Servidor">
              <Card
                title="API de documentos"
                description="Só aparece em desenvolvimento. Em branco, o app usa o endereço do build (o Render) ou, sem ele, o PC que roda o Metro. Para a API local, digite o endereço que o npm run api:up mostra."
              >
                <Stack gap="label">
                  <TextField
                    label="Endereço da API"
                    accessibilityLabel="Endereço da API"
                    value={endereco}
                    onChangeText={setEndereco}
                    placeholder={enderecoAutomatico() ?? EXEMPLO_DE_ENDERECO}
                    keyboardType="url"
                    autoCapitalize="none"
                  />
                  <Button label="Salvar endereço" preset="secondary" onPress={salvarEndereco} />
                </Stack>
              </Card>
            </Section>

            <Section label="Dados">
              <Button label="Limpar dados do app" preset="danger" onPress={confirmarLimpeza} />
            </Section>
          </>
        ) : null}
      </Stack>
    </Screen>
  );
}
