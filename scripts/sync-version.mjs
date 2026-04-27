import fs from 'fs';
import path from 'path';

const raiz = process.cwd();

function ler_versao_pacote() {
  const caminho_pacote = path.join(raiz, 'package.json');
  const conteudo = fs.readFileSync(caminho_pacote, 'utf8');
  const pacote = JSON.parse(conteudo);
  return pacote.version || '1.0.0';
}

function calcular_codigo_versao(versao) {
  const partes = String(versao).split('.');
  const maior = parseInt(partes[0] || '0', 10) || 0;
  const menor = parseInt(partes[1] || '0', 10) || 0;
  const patch = parseInt(partes[2] || '0', 10) || 0;
  return maior * 10000 + menor * 100 + patch;
}

function atualizar_android(versao, codigo) {
  const caminho_gradle = path.join(raiz, 'android', 'app', 'build.gradle');
  if (!fs.existsSync(caminho_gradle)) return;
  let texto = fs.readFileSync(caminho_gradle, 'utf8');
  texto = texto.replace(/versionCode\s+\d+/, `versionCode ${codigo}`);
  texto = texto.replace(/versionName\s+"[^"]*"/, `versionName "${versao}"`);
  fs.writeFileSync(caminho_gradle, texto, 'utf8');
}

function atualizar_ios(versao, codigo) {
  const caminho_projeto = path.join(raiz, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
  if (!fs.existsSync(caminho_projeto)) return;
  let texto = fs.readFileSync(caminho_projeto, 'utf8');
  texto = texto.replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${versao};`);
  texto = texto.replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${codigo};`);
  fs.writeFileSync(caminho_projeto, texto, 'utf8');
}

try {
  const versao = ler_versao_pacote();
  const codigo = calcular_codigo_versao(versao);
  atualizar_android(versao, codigo);
  atualizar_ios(versao, codigo);
  console.log(`Versão sincronizada: ${versao} (code/build ${codigo})`);
  process.exit(0);
} catch (erro) {
  console.error('Falha ao sincronizar versão:', erro?.message || erro);
  process.exit(1);
}

