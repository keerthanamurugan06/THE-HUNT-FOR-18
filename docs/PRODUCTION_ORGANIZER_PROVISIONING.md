# Production Organizer Account Procedure

This is a preparation guide only. No production account or role has been created. Production account creation requires separate explicit approval naming the production project and organizer login email.

## Provisioning

1. In the approved production Supabase project, confirm public Auth signups are disabled.
2. In Supabase Auth, create the organizer Auth user for the approved email and a locally generated strong password. Supabase Auth stores its password verifier; do not add the password to any application table.
3. Copy the new Auth user UUID from the Auth user record. Using the production SQL editor only after the owner's separate approval, grant organizer authorization:

   ```sql
   insert into public.organizer_roles (user_id, role)
   values ('<new-auth-user-uuid>', 'organizer');
   ```

4. Test the organizer login and an organizer-only route. Confirm a participant account is still denied.
5. Generate a 32-byte random password locally, enter it in Auth, and store the email/password locally using Windows DPAPI for the current Windows user. Keep the file outside the repository, for example under `%LOCALAPPDATA%\HuntFor18\organizer-production.xml`.

   After the separate production approval, the local preparation command can be:

   ```powershell
   $organizerEmail = '<approved-organizer-email>'
   $secretBytes = [Security.Cryptography.RandomNumberGenerator]::GetBytes(32)
   $organizerPassword = [Convert]::ToBase64String($secretBytes).TrimEnd('=').Replace('+','-').Replace('/','_')
   $securePassword = ConvertTo-SecureString $organizerPassword -AsPlainText -Force
   $organizerCredential = [Management.Automation.PSCredential]::new($organizerEmail, $securePassword)
   $credentialDirectory = Join-Path $env:LOCALAPPDATA 'HuntFor18'
   New-Item -ItemType Directory -Force -Path $credentialDirectory | Out-Null
   $credentialFile = Join-Path $credentialDirectory 'organizer-production.xml'
   $organizerCredential | Export-Clixml -LiteralPath $credentialFile
   $organizerPassword | Set-Clipboard
   Remove-Variable organizerPassword, secretBytes, securePassword
   ```

   Paste the clipboard password into the Supabase Auth password field, then clear the clipboard after saving. This command has not been run.

PowerShell retrieval for the local encrypted credential file:

```powershell
$credentialFile = Join-Path $env:LOCALAPPDATA 'HuntFor18\organizer-production.xml'
$credential = Import-Clixml -LiteralPath $credentialFile
$credential.UserName
$credential.GetNetworkCredential().Password | Set-Clipboard
```

The retrieved password is copied only to the local clipboard. Do not paste credentials into chat, source code, database tables, issue trackers, shell logs, or Git. The DPAPI file can be decrypted only by the same Windows user on the same machine.

## Approval gate

The steps above have not been executed. The production Supabase Auth directory and production database remain untouched. Before provisioning, request explicit approval for the production project and the exact organizer login email. Then perform the Auth user creation, add the `organizer_roles` row, verify login and authorization, and create the DPAPI-protected local credential file.
