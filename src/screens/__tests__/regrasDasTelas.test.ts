/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const RAIZ = join(__dirname, '..', '..', '..');
const PACOTES_PERMITIDOS_NAS_TELAS = ['react', '@react-navigation/native'];
const PASTAS_DE_INTERFACE = ['src/screens', 'src/components'];
const CHAVES_DE_ESTILO_NUMERICO =
  '(?:padding|margin)\\w*|gap|rowGap|columnGap|top|right|bottom|left|width|height|minWidth|minHeight|maxWidth|maxHeight|fontSize|lineHeight|letterSpacing|border\\w*Radius|border\\w*Width|strokeWidth|shadowRadius|elevation|aspectRatio|translate[XY]|size';

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
      (PASTAS_DE_INTERFACE.some((pasta) => arquivo.startsWith(join(RAIZ, pasta))) ||
        /\bfrom\s+['"]react-native(?:-[\w-]+)?['"]/.test(readFileSync(arquivo, 'utf8'))),
  );
}

function importsProibidos(codigo: string): string[] {
  const modulos = [...codigo.matchAll(/(?:\bfrom\s+|\bimport\s+|\brequire\(\s*|\bimport\(\s*)['"]([^'"]+)['"]/g)].map(
    (encontrado) => encontrado[1],
  );
  return modulos.filter((modulo) => !modulo.startsWith('.') && !PACOTES_PERMITIDOS_NAS_TELAS.includes(modulo));
}

function estilosPassados(codigo: string): string[] {
  return [...codigo.matchAll(/\b\w*[sS]tyle\s*=/g)].map((encontrado) => encontrado[0]);
}

function coresLiterais(codigo: string): string[] {
  return [...codigo.matchAll(/#[0-9A-Fa-f]{3,8}\b|\b(?:rgb|hsl)a?\([^)]*\)/g)].map((encontrada) => encontrada[0]);
}

function numerosDeEstilo(codigo: string): string[] {
  const padrao = new RegExp(`\\b(${CHAVES_DE_ESTILO_NUMERICO})\\s*[:=]\\s*\\{?\\s*(-?\\d*\\.?\\d+)`, 'g');
  return [...codigo.matchAll(padrao)]
    .filter((encontrado) => Number(encontrado[2]) !== 0)
    .map((encontrado) => `${encontrado[1]}: ${encontrado[2]}`);
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

  test('estilosPassados aponta style e contentContainerStyle, com ou sem espaço antes do igual', () => {
    const codigo = [
      '<Stack gap="section" style={x} />',
      '<List contentContainerStyle={y} />',
      '<Card style = {z} />',
    ].join('\n');

    expect(estilosPassados(codigo)).toEqual(['style=', 'contentContainerStyle=', 'style =']);
  });

  test('coresLiterais aponta hex, rgb e hsl', () => {
    const codigo = [
      "color: '#0D1B2A', borderColor: '#fff', fill: 'none',",
      "shadowColor: 'rgba(13, 27, 42, 0.2)', tintColor: 'hsl(210, 50%, 20%)',",
    ].join('\n');

    expect(coresLiterais(codigo)).toEqual(['#0D1B2A', '#fff', 'rgba(13, 27, 42, 0.2)', 'hsl(210, 50%, 20%)']);
  });

  test('numerosDeEstilo aponta número solto em estilo e em prop de medida, e aceita zero, flex e token', () => {
    const codigo = [
      'const estilos = { padding: 12, marginTop: -4, flex: 1, top: 0, gap: theme.gap.list };',
      '<Svg width={22} height={theme.size.iconMedium} />',
      '<TextInput maxLength={40} numberOfLines={1} />',
      'const sombra = { borderTopLeftRadius: 8, shadowRadius: 4, elevation: 3 };',
      'const quadro = { aspectRatio: 1.5, transform: [{ translateX: 10 }] };',
    ].join('\n');

    expect(numerosDeEstilo(codigo)).toEqual([
      'padding: 12',
      'marginTop: -4',
      'width: 22',
      'borderTopLeftRadius: 8',
      'shadowRadius: 4',
      'elevation: 3',
      'aspectRatio: 1.5',
      'translateX: 10',
    ]);
  });
});

describe('regras das telas', () => {
  test('as telas só importam react, @react-navigation/native e módulos próprios, sem passar estilo', () => {
    const arquivos = arquivosDoCodigo(join(RAIZ, 'src/screens'));

    expect(arquivos).toContain(join(RAIZ, 'src/screens/NovaAssinaturaScreen/index.tsx'));
    expect([...violacoes(arquivos, importsProibidos), ...violacoes(arquivos, estilosPassados)]).toEqual([]);
  });

  test('nenhuma cor literal fora de src/theme', () => {
    const arquivos = arquivosDeInterface();

    expect(arquivos).toContain(join(RAIZ, 'src/gestures/SignaturePad.tsx'));
    expect(arquivos).toContain(join(RAIZ, 'src/storage/SettingsProvider.tsx'));
    expect(arquivos).toContain(join(RAIZ, 'src/components/DesenhoSvg/index.tsx'));
    expect(violacoes(arquivos, coresLiterais)).toEqual([]);
  });

  test('nenhum número de estilo fora de src/theme', () => {
    const arquivos = arquivosDeInterface();

    expect(arquivos).toContain(join(RAIZ, 'src/components/Button/presets.ts'));
    expect(arquivos).toContain(join(RAIZ, 'src/components/Icon/presets.ts'));
    expect(violacoes(arquivos, numerosDeEstilo)).toEqual([]);
  });
});
