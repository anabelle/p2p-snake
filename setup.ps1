# Setup script for Multiplayer Snake Game
Write-Host "Setting up Multiplayer Snake Game..." -ForegroundColor Green

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Cyan
npm install

# Check if installation was successful
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install dependencies. Please check your Node.js installation and try again." -ForegroundColor Red
    exit 1
}

Write-Host "Dependencies installed successfully!" -ForegroundColor Green

# Create a .env file for local development
$envContent = @"
REACT_APP_SIGNALING_SERVER_URL=http://localhost:3001
"@

$envContent | Out-File -FilePath ".env" -Encoding utf8
Write-Host "Created .env file with local development settings." -ForegroundColor Green

# Information on how to run the application
Write-Host "`nSetup completed successfully!" -ForegroundColor Green
Write-Host "`nTo start the application:" -ForegroundColor Yellow
Write-Host "1. Start the signaling server: node signaling-server.js" -ForegroundColor Yellow
Write-Host "2. In another terminal, start the React app: npm start" -ForegroundColor Yellow
Write-Host "`nOpen http://localhost:3000 in your browser to play the game." -ForegroundColor Yellow
Write-Host "To test multiplayer, open the game in multiple browser windows." -ForegroundColor Yellow 