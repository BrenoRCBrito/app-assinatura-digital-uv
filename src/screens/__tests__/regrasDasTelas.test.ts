/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const RAIZ = join(__dirname, '..', '..', '..');
const PACOTES_PERMITIDOS_NAS_TELAS = ['react', '@react-navigation/native'];
const TELAS_MIGRADAS = ['HomeScreen', 'LoginScreen', 'SettingsScreen', 'AssinaturasScreen', 'NovaAssinaturaScreen'];

function arquivosDoCodigo(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    if (statSync(caminho).isDirectory()) {
      return nome === '__tests__' ? [] : arquivosDoCodigo(caminho);
    }
    return /\.tsx?$/.test(nome) ? [caminho] : [];
  });
}

function arquivosDeInterface(): string[] {
  return arquivosDoCodigo(join(RAIZ, 'src')).filter(
    (arquivo) =>
      !arquivo.startsWith(join(RAIZ, 'src', 'theme')) &&
      (arquivo.startsWith(join(RAIZ, 'src', 'screens')) ||
        /\bfrom\s+['"]react-native['"]/.test(readFileSync(arquivo, 'utf8'))),
  );
}

function importsProibidos(codigo: string): string[] {
  const modulos = [...codigo.matchAll(/(?:\bfrom\s+|\bimport\s+|\brequire\(\s*|\bimport\(\s*)['"]([^'"]+)['"]/g)].map(
    (encontrado) => encontrado[1],
  );
  return modulos.filter((modulo) => !modulo.startsWith('.') && !PACOTES_PERMITIDOS_NAS_TELAS.includes(modulo));
}

function estilosPassados(codigo: string): string[] {
  return [...codigo.matchAll(/\b\w*[sS]tyle=/g)].map((encontrado) => encontrado[0]);
}

function coresEmHex(codigo: string): string[] {
  return [...codigo.matchAll(/#[0-9A-Fa-f]{3,8}\b/g)].map((encontrada) => encontrada[0]);
}

function violacoes(arquivos: readonly string[], verificar: (codigo: string) => string[]): string[] {
  return arquivos.flatMap((arquivo) =>
    verificar(readFileSync(arquivo, 'utf8')).map((achado) => `${relative(RAIZ, arquivo)}: ${achado}`),
  );
}

describe('verificadores das regras', () => {
  test('importsProibidos aponta pacote fora da lista e aceita react, navegação e caminhos próprios', () => {
    const codigo = [
      "import React, { useState } from 'react';",
      "import { useFocusEffect } from '@react-navigation/native';",
      "import { View } from 'react-native';",
      "import type { Assinatura } from '../../domain/assinatura';",
      'import {',
      '  Screen,',
      "} from '../../components';",
      "const logo = require('expo-asset');",
    ].join('\n');

    expect(importsProibidos(codigo)).toEqual(['react-native', 'expo-asset']);
  });

  test('estilosPassados aponta style e contentContainerStyle', () => {
    expect(estilosPassados('<Stack gap="section" style={x} />\n<List contentContainerStyle={y} />')).toEqual([
      'style=',
      'contentContainerStyle=',
    ]);
  });

  test('coresEmHex aponta hex de três a oito dígitos', () => {
    expect(coresEmHex("color: '#0D1B2A', borderColor: '#fff', fill: 'none'")).toEqual(['#0D1B2A', '#fff']);
  });
});

describe('regras das telas', () => {
  test.each(TELAS_MIGRADAS)('%s só importa react, @react-navigation/native e módulos próprios, sem passar estilo', (tela) => {
    const arquivos = arquivosDoCodigo(join(RAIZ, 'src/screens', tela));

    expect([...violacoes(arquivos, importsProibidos), ...violacoes(arquivos, estilosPassados)]).toEqual([]);
  });

  test('nenhuma cor em hex fora de src/theme', () => {
    const arquivos = arquivosDeInterface();

    expect(arquivos).toContain(join(RAIZ, 'src/gestures/SignaturePad.tsx'));
    expect(arquivos).toContain(join(RAIZ, 'src/storage/SettingsProvider.tsx'));
    expect(violacoes(arquivos, coresEmHex)).toEqual([]);
  });
});
