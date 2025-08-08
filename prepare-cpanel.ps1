# Copy the cPanel entry file to the dist directory
Copy-Item -Path "server/cpanel-entry.js" -Destination "dist-server/server/" -Force

# Copy the .htaccess file for cPanel
Copy-Item -Path "server/.htaccess" -Destination "dist-server/server/" -Force

# Copy the cpanel.json file for cPanel
Copy-Item -Path "server/cpanel.json" -Destination "dist-server/server/" -Force

# Copy the .user.ini file for cPanel PHP configuration
Copy-Item -Path "server/.user.ini" -Destination "dist-server/server/" -Force

# Copy the .cpanel.yml file
Copy-Item -Path "dist-server/.cpanel.yml" -Destination "dist-server/server/" -Force

# Create install script
$installScript = @"
#!/bin/bash
echo "Installing dependencies for Snake Game Server..."
npm install --production
echo "Dependencies installed successfully!"
"@

Set-Content -Path "dist-server/server/install.sh" -Value $installScript -Encoding UTF8

Write-Host "Server compiled successfully! Files are ready in the dist-server directory."
Write-Host "To deploy to cPanel, upload the entire dist-server directory to your server."
