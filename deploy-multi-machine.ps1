# deploy-multi-machine.ps1
# Script PowerShell để deploy trên nhiều máy

param(
    [Parameter(Mandatory=$true)]
    [string]$Option,
    [string]$Machine1IP = "192.168.1.100",
    [string]$Machine2IP = "192.168.1.101"
)

function Deploy-DockerSwarm {
    Write-Host "=== Deploying with Docker Swarm ===" -ForegroundColor Green
    
    Write-Host "1. Initialize Docker Swarm on Machine 1 (Manager):"
    Write-Host "   docker swarm init --advertise-addr $Machine1IP" -ForegroundColor Yellow
    
    Write-Host "`n2. On Machine 2, join the swarm (get token from Machine 1):"
    Write-Host "   docker swarm join --token <worker-token> $Machine1IP:2377" -ForegroundColor Yellow
    
    Write-Host "`n3. Label the worker node for replica placement:"
    Write-Host "   docker node update --label-add role=replica <NODE-ID>" -ForegroundColor Yellow
    
    Write-Host "`n4. Deploy the stack:"
    Write-Host "   docker stack deploy -c docker-compose.swarm.yml projectL" -ForegroundColor Yellow
}

function Deploy-SeparateCompose {
    Write-Host "=== Deploying with Separate Docker Compose ===" -ForegroundColor Green
    
    Write-Host "1. Update IP addresses in compose files:"
    Write-Host "   - Edit docker-compose.machine1.yml: Replace MACHINE2_IP with $Machine2IP"
    Write-Host "   - Ensure Machine 2 can access Machine 1 at $Machine1IP"
    
    Write-Host "`n2. On Machine 1, run:"
    Write-Host "   docker-compose -f docker-compose.machine1.yml up -d" -ForegroundColor Yellow
    
    Write-Host "`n3. On Machine 2, run:"
    Write-Host "   docker-compose -f docker-compose.machine2.yml up -d" -ForegroundColor Yellow
    
    Write-Host "`n4. Initialize MongoDB Replica Set:"
    Write-Host "   bash init-replica-multi-machine.sh" -ForegroundColor Yellow
}

function Deploy-Kubernetes {
    Write-Host "=== Deploying with Kubernetes ===" -ForegroundColor Green
    
    Write-Host "1. Label your nodes:"
    Write-Host "   kubectl label nodes <node1-name> node-type=primary" -ForegroundColor Yellow
    Write-Host "   kubectl label nodes <node2-name> node-type=replica" -ForegroundColor Yellow
    
    Write-Host "`n2. Apply the deployment:"
    Write-Host "   kubectl apply -f kubernetes-deployment.yaml" -ForegroundColor Yellow
    
    Write-Host "`n3. Check the deployment:"
    Write-Host "   kubectl get pods -n projectL" -ForegroundColor Yellow
}

function Show-NetworkRequirements {
    Write-Host "`n=== Network Requirements ===" -ForegroundColor Cyan
    Write-Host "1. Machine 1 ($Machine1IP) needs to access:"
    Write-Host "   - Machine 2:27018 (MongoDB Read)"
    Write-Host "`n2. Machine 2 ($Machine2IP) needs to access:"
    Write-Host "   - Machine 1:27017 (MongoDB Write)"
    Write-Host "`n3. Firewall ports to open:"
    Write-Host "   - 27017, 27018 (MongoDB)"
    Write-Host "   - 6379 (Redis)"
    Write-Host "   - 4000 (Backend API)"
    Write-Host "   - 5173 (Frontend)"
    Write-Host "   - 8000, 8001 (AI Service, Image Processor)"
}

# Main execution
switch ($Option.ToLower()) {
    "swarm" { 
        Deploy-DockerSwarm
        Show-NetworkRequirements
    }
    "compose" { 
        Deploy-SeparateCompose
        Show-NetworkRequirements
    }
    "k8s" { 
        Deploy-Kubernetes 
        Show-NetworkRequirements
    }
    default {
        Write-Host "Usage: .\deploy-multi-machine.ps1 -Option <swarm|compose|k8s>" -ForegroundColor Red
        Write-Host "`nOptions:" -ForegroundColor Yellow
        Write-Host "  swarm   - Deploy using Docker Swarm (Recommended)"
        Write-Host "  compose - Deploy using separate Docker Compose files"
        Write-Host "  k8s     - Deploy using Kubernetes"
        Write-Host "`nExample:"
        Write-Host "  .\deploy-multi-machine.ps1 -Option swarm -Machine1IP 192.168.1.100 -Machine2IP 192.168.1.101"
    }
}