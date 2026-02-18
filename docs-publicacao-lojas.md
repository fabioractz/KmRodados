# Publicação do aplicativo (Android e iOS)

## ⚡ Resumo rápido (o que fazer sempre)

### Android

1. Mudar `"version"` no `package.json`
2. Rodar:
   ```bash
   npm run release:android
   ```
3. Abrir projeto Android:
   ```bash
   npx cap open android
   ```
4. No Android Studio:
   - Gerar **Android App Bundle (.aab)**
   - Enviar o `.aab` para a Google Play Console

### iOS

1. Mudar `"version"` no `package.json`
2. Rodar:
   ```bash
   npm run release:ios
   ```
3. Abrir projeto iOS:
   ```bash
   npx cap open ios
   ```
4. No Xcode:
   - Arquivar (`Product` → `Archive`)
   - Enviar o build pelo Organizer para a App Store

> Observação: os comandos `release:*` já fazem:
> - sincronizar versão (`version:sync`)
> - build de produção (`build --configuration production`)
> - sync com Capacitor + patch de AdMob (`sync:android` / `sync:ios`)

---

## Detalhes importantes (se precisar revisar)

### Versão unificada (web, Android, iOS)

- A versão é definida em `package.json` no campo `"version"`.
- `npm run version:sync` é chamado automaticamente pelos comandos `release:*` e atualiza:
  - `versionCode` / `versionName` no Android
  - `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION` no iOS

---

## 2. Versão unificada (web, Android e iOS)

### ADS (anúncios)

- Em desenvolvimento é usado `environment.ts`:
  - `production: false`
  - `ads.enabled: true`
  - `ads.testMode: true` (anúncios de teste)
- Em produção é usado `environment.prod.ts`:
  - `production: true`
  - `ads.enabled: true`
  - `ads.testMode: false` (anúncios reais)

### Build e sincronização

- `npm run build -- --configuration production`:
  - Gera o bundle web otimizado na pasta `www/`
  - Usa `environment.prod.ts`
- `npm run sync:android` / `npm run sync:ios`:
  - Copiam `www/` para os projetos nativos
  - Aplicam o patch de AdMob e permissões (script `patch-admob.mjs`)

Os comandos `release:android` e `release:ios` encadeiam tudo isso para você.

Após alterar a versão, execute:

```bash
npm run version:sync
```

O que esse comando faz:

- Roda o script `scripts/sync-version.mjs`
- Lê a versão do `package.json` (ex: `1.2.3`)
- Calcula o **código de versão numérico**:
  - Fórmula: `code = major * 10000 + minor * 100 + patch`
  - Exemplo: `1.2.3` → `10203`
- Atualiza:
  - **Android** (`android/app/build.gradle`):
    - `versionCode 10203`
    - `versionName "1.2.3"`
  - **iOS** (`ios/App/App.xcodeproj/project.pbxproj`):
    - `MARKETING_VERSION = 1.2.3;`
    - `CURRENT_PROJECT_VERSION = 10203;`

Resultado: mesma versão e código de build em todas as plataformas.

---

## 3. Configuração de ADS (anúncios)

Os ambientes de desenvolvimento e produção são controlados por:

- `src/environments/environment.ts` (DESENVOLVIMENTO)
- `src/environments/environment.prod.ts` (PRODUÇÃO)

### 3.1. Desenvolvimento (`environment.ts`)

Trecho principal:

```ts
export const environment = {
  production: false,
  ads: {
    enabled: true,
    testMode: true
  }
};
```

Significado:

- `production: false` → ambiente de desenvolvimento
- `ads.enabled: true` → anúncios habilitados
- `ads.testMode: true` → anúncios **sempre em modo de teste**

Uso:

- Quando roda `ng serve`, `ionic serve` ou build normal de dev, esse arquivo é usado.
- Seguro para desenvolvimento (cliques não contam na conta do AdMob).

### 3.2. Produção (`environment.prod.ts`)

Trecho principal:

```ts
export const environment = {
  production: true,
  ads: {
    enabled: true,
    testMode: false
  }
};
```

Significado:

- `production: true` → ambiente de produção
- `ads.enabled: true` → anúncios habilitados na versão de loja
- `ads.testMode: false` → anúncios reais do AdMob

Uso:

- Quando você gera o build com `--configuration production`, o Angular substitui automaticamente o `environment.ts` por `environment.prod.ts`.
- Essa é a configuração usada no app que vai para a loja.

---

## 4. Build Angular de produção

Para gerar o bundle web otimizado em modo produção:

```bash
npm run build -- --configuration production
```

O que acontece:

- Roda `ng build` em modo produção
- Usa `environment.prod.ts`:
  - `production: true`
  - `ads.enabled: true`
  - `ads.testMode: false`
- Aplica otimizações:
  - Minificação de JavaScript e CSS
  - Tree-shaking
  - Otimizações de template Angular

Saída:

- Os arquivos finais são gerados na pasta `www/`
- Esta pasta é usada pelo Capacitor para montar o app nativo (Android/iOS)

---

## 5. Sincronizar com Android (Capacitor + AdMob)

Após gerar o build de produção, execute:

```bash
npm run sync:android
```

No `package.json`:

```json
"sync:android": "npx cap sync android && node scripts/patch-admob.mjs"
```

Esse comando faz duas etapas:

### 5.1. `npx cap sync android`

- Copia o conteúdo da pasta `www/` para o projeto Android nativo
- Atualiza plugins Capacitor (StatusBar, AdMob, etc.)
- Garante que as alterações da parte web estejam refletidas no projeto Android

### 5.2. `node scripts/patch-admob.mjs`

Responsável por garantir a configuração correta do AdMob no Android e iOS.

Para Android:

- Abre `android/app/src/main/AndroidManifest.xml`:
  - Se ainda não existir a configuração, adiciona:
    ```xml
    <meta-data
        android:name="com.google.android.gms.ads.APPLICATION_ID"
        android:value="@string/admob_app_id" />
    ```
- Abre `android/app/src/main/res/values/strings.xml`:
  - Cria ou atualiza:
    ```xml
    <string name="admob_app_id">ca-app-pub-1236052583132522~1313491055</string>
    ```

Para iOS (também patchado, mesmo chamando via `sync:android`, o script é idempotente):

- Abre `ios/App/App/Info.plist`:
  - Garante:
    ```xml
    <key>GADApplicationIdentifier</key>
    <string>ca-app-pub-1236052583132522~4949483732</string>
    ```
  - Garante descrições:
    - `NSLocationWhenInUseUsageDescription`
    - `NSUserTrackingUsageDescription`
  - Garante um item mínimo em `SKAdNetworkItems`

---

## 6. Gerar versão Android para Play Store

Fluxo completo recomendado:

1. Ajustar versão no `package.json`
2. Sincronizar versão:
   ```bash
   npm run version:sync
   ```
3. Gerar build de produção:
   ```bash
   npm run build -- --configuration production
   ```
4. Sincronizar Android + AdMob:
   ```bash
   npm run sync:android
   ```
5. Abrir projeto no Android Studio:
   ```bash
   npx cap open android
   ```
6. No Android Studio:
   - Verificar `versionName` e `versionCode`
   - Verificar nome e ícone do app
   - Gerar **Android App Bundle (.aab)**:
     - Menu: `Build` → `Generate Signed Bundle / APK...`
     - Escolher **Android App Bundle**
     - Selecionar o keystore de produção
7. Enviar o `.aab` para a Google Play Console

---

## 7. Sincronizar com iOS (Capacitor + AdMob)

Após o build de produção, para iOS execute:

```bash
npm run sync:ios
```

No `package.json`:

```json
"sync:ios": "npx cap sync ios && node scripts/patch-admob.mjs"
```

### 7.1. `npx cap sync ios`

- Copia o conteúdo da pasta `www/` para o projeto iOS
- Atualiza plugins do Capacitor no projeto iOS

### 7.2. `node scripts/patch-admob.mjs`

- Garante o App ID do AdMob no `Info.plist`
- Garante mensagens de permissão de localização e tracking
- Garante um item básico em `SKAdNetworkItems`

---

## 8. Gerar versão iOS para App Store

Fluxo completo recomendado:

1. Ajustar versão no `package.json`
2. Sincronizar versão:
   ```bash
   npm run version:sync
   ```
3. Gerar build de produção (se ainda não tiver feito):
   ```bash
   npm run build -- --configuration production
   ```
4. Sincronizar iOS + AdMob:
   ```bash
   npm run sync:ios
   ```
5. Abrir projeto no Xcode:
   ```bash
   npx cap open ios
   ```
6. No Xcode:
   - Verificar:
     - `Marketing Version` (versão)
     - `Build` (código de versão)
     - App ID de AdMob no `Info.plist`
     - Permissões de localização e tracking
   - Selecionar um dispositivo ou “Any iOS Device”
   - Menu: `Product` → `Archive`
7. Após gerar o Archive:
   - Abrir o Organizer
   - Escolher o archive do app
   - Enviar para a App Store (App Store Connect)

---

## 9. Sincronizar tudo de uma vez (Android + iOS)

Se quiser apenas garantir que os dois projetos nativos (Android e iOS) estejam atualizados de uma vez:

```bash
npm run sync:all
```

No `package.json`:

```json
"sync:all": "npx cap sync && node scripts/patch-admob.mjs"
```

O que faz:

- `npx cap sync`:
  - Sincroniza **Android e iOS** com a pasta `www/`
- `patch-admob.mjs`:
  - Garante configuração de AdMob e permissões em ambos

Depois disso:

- Para Android: abrir no Android Studio e gerar `.aab`
- Para iOS: abrir no Xcode, arquivar e enviar para a App Store
