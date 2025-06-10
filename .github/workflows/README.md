# GitHub Workflows for TaskBookly

This repository includes several GitHub Actions workflows to automate building, testing, and releasing the TaskBookly Electron application.

## Workflows

### 1. CI Workflow (`ci.yml`)
**Triggered on:** Push to `main`/`develop` branches, Pull Requests to `main`

**What it does:**
- Runs linting checks
- Tests building on multiple Node.js versions (18, 20)
- Tests building on multiple platforms (Ubuntu, Windows, macOS)
- Ensures the app builds successfully before merging

### 2. Release Workflow (`release.yml`)
**Triggered on:** Git tags starting with `v` (e.g., `v1.0.0`)

**What it does:**
- Builds distributable packages for all platforms:
  - **Linux**: AppImage and tar.gz
  - **Windows**: Portable executable and MSI installer
  - **macOS**: DMG installer
- Creates a GitHub release with all build artifacts
- Automatically generates release notes

**To create a release:**
```bash
git tag v1.0.0
git push origin v1.0.0
```

### 3. Draft Release Workflow (`draft-release.yml`)
**Triggered on:** Manual workflow dispatch

**What it does:**
- Allows you to manually trigger a build for a specific version
- Creates a draft release that you can review before publishing
- Useful for testing releases before making them public

**To use:**
1. Go to Actions tab in GitHub
2. Select "Build Draft Release"
3. Click "Run workflow"
4. Enter the version (e.g., `v1.0.0`)

### 4. Security Audit Workflow (`security.yml`)
**Triggered on:** 
- Weekly schedule (Mondays at 2 AM UTC)
- Push to `main` branch
- Pull Requests to `main`

**What it does:**
- Runs `npm audit` to check for security vulnerabilities
- Fails the build if high or critical vulnerabilities are found
- Helps maintain security best practices

### 5. Dependency Updates Workflow (`dependencies.yml`)
**Triggered on:** 
- Weekly schedule (Sundays at midnight UTC)
- Manual workflow dispatch

**What it does:**
- Checks for outdated dependencies
- Updates patch and minor versions automatically
- Creates a Pull Request with the updates
- Helps keep dependencies current and secure

## Required Secrets

For the workflows to work properly, you'll need to set up these GitHub secrets:

### Required for all workflows:
- `GITHUB_TOKEN` - Automatically provided by GitHub

### Required for macOS code signing (optional but recommended):
- `CSC_LINK` - Base64 encoded .p12 certificate file
- `CSC_KEY_PASSWORD` - Password for the .p12 certificate
- `APPLE_ID` - Your Apple ID email
- `APPLE_APP_SPECIFIC_PASSWORD` - App-specific password for notarization
- `APPLE_TEAM_ID` - Your Apple Developer Team ID

## Setting up Secrets

1. Go to your repository settings
2. Navigate to "Secrets and variables" → "Actions"
3. Click "New repository secret"
4. Add the required secrets

## Code Signing Setup

### macOS
To enable code signing for macOS builds:

1. Export your Developer ID Application certificate from Keychain Access as a .p12 file
2. Convert it to base64: `base64 -i certificate.p12 | pbcopy`
3. Add the base64 string as `CSC_LINK` secret
4. Add your certificate password as `CSC_KEY_PASSWORD` secret
5. Create an app-specific password at appleid.apple.com
6. Add your Apple ID and app-specific password as secrets

### Windows
To enable code signing for Windows builds:

1. Get a code signing certificate from a trusted CA
2. Add `CSC_LINK` (certificate file) and `CSC_KEY_PASSWORD` secrets

## Build Artifacts

The workflows generate the following artifacts:

- **Linux**: `.AppImage` (portable) and `.tar.gz` (archive)
- **Windows**: `.exe` (portable) and `.msi` (installer)
- **macOS**: `.dmg` (installer) and `.zip` (archive)

## Customization

You can customize these workflows by:

1. Modifying the trigger conditions
2. Adding additional build steps
3. Changing the platforms or Node.js versions
4. Adding custom notifications
5. Integrating with other services

## Troubleshooting

### Common Issues:

1. **Build fails on macOS**: Check code signing configuration
2. **Security audit fails**: Update vulnerable dependencies
3. **Artifacts not uploaded**: Check file paths in workflow
4. **Release not created**: Ensure tag format is correct (`vX.Y.Z`)

### Getting Help:

- Check the Actions tab for detailed logs
- Review the workflow files for configuration
- Consult GitHub Actions documentation for advanced usage
