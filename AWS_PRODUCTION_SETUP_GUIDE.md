# Definitive AWS Production Infrastructure Guide for Live 2030

> **STRICT ARCHITECTURAL MANDATE**: 
> This document specifies the **single definitive AWS product configuration** for Live 2030. No multiple choices or ambiguous options. Every product, instance size, and configuration parameter listed below is the final production choice designed to scale to 1,000,000+ concurrent users with zero downtime.

---

## 1. Master AWS Product Bill of Materials (Exact Stack)

| Function | Final AWS Product | Exact Model / Tier | Production Purpose |
| :--- | :--- | :--- | :--- |
| **Compute & Microservices** | **AWS ECS on AWS Fargate** | Linux x86_64, Serverless Container Engine | Zero server patching, autoscales backend & admin dashboard from 2 to 50+ tasks |
| **Primary Relational DB** | **Amazon RDS PostgreSQL 16** | `db.t4g.medium` (Multi-AZ, 100GB gp3) | ACID financial ledger, wallet balances, user/agency relationships |
| **In-Memory Cache & Pub/Sub** | **Amazon ElastiCache for Redis 7** | `cache.t4g.medium` (Cluster Mode) | Sub-millisecond room presence, gift fan-out, viewer count counters |
| **Media & Static Storage** | **Amazon Simple Storage Service (S3)** | S3 Standard (`live2030-media-vault`) | Host avatars, SVGA luxury gift animations, stream recordings |
| **Global Edge CDN** | **Amazon CloudFront** | Price Class: All Edge Locations | Global asset distribution with sub-50ms latency worldwide |
| **Traffic & SSL Ingress** | **AWS Application Load Balancer (ALB)** | Dual-Zone ALB with HTTPS / WSS | Balances REST API and WebSocket (`ws://`) connections |
| **SSL / TLS Certificate** | **AWS Certificate Manager (ACM)** | Free 2048-bit RSA Wildcard Cert | Provides automated HTTPS and WSS encryption (`*.live2030.com`) |
| **Domain DNS Management** | **Amazon Route 53** | Public Hosted Zone | Low-latency DNS routing to Application Load Balancer |

---

## 2. Step-by-Step Creation Runbook in AWS Console

### Step 1: Create Amazon S3 Media Bucket
1. Open **AWS S3 Console** $\rightarrow$ Click **"Create bucket"**.
2. **Bucket name**: `live2030-production-media-vault`.
3. **Region**: `us-east-1` (N. Virginia) or your primary operating region.
4. **Object Ownership**: ACLs disabled (recommended).
5. **Block Public Access**: Keep blocked; access will be routed through CloudFront Origin Access Control (OAC).
6. Click **"Create bucket"**.

---

### Step 2: Create Amazon RDS for PostgreSQL 16
1. Open **Amazon RDS Console** $\rightarrow$ Click **"Create database"**.
2. **Engine type**: **PostgreSQL**.
3. **Engine Version**: **PostgreSQL 16.3-R1** or latest 16.x.
4. **Templates**: **Production**.
5. **Availability & durability**: **Multi-AZ DB cluster** (Ensures zero data loss and automated failover).
6. **DB instance identifier**: `live2030-production-db`.
7. **Master username**: `postgres`.
8. **Master password**: Generate a secure 24-character password.
9. **Instance configuration**:
   - DB instance class: **Burstable classes (includes t classes)** $\rightarrow$ Select **`db.t4g.medium`** (2 vCPU, 4 GiB RAM).
10. **Storage**:
    - Storage type: **General Purpose SSD (gp3)**.
    - Allocated storage: **100 GiB**.
    - Storage autoscaling: **Enable storage autoscaling** (Maximum limit: 500 GiB).
11. **Connectivity**:
    - VPC: Select your default or custom production VPC.
    - Public access: **No** (Database must only be accessible from ECS backend services).
    - Database port: `5432`.
12. Click **"Create database"**.

---

### Step 3: Create Amazon ElastiCache for Redis 7
1. Open **Amazon ElastiCache Console** $\rightarrow$ Click **"Create Redis cluster"**.
2. **Deployment option**: **Cluster mode enabled**.
3. **Cluster name**: `live2030-redis-cluster`.
4. **Engine version**: **7.1** or latest 7.x.
5. **Node type**: Select **`cache.t4g.medium`** (2 vCPUs, 3.09 GiB RAM).
6. **Number of shards**: **2** (Provides automatic sharding for millions of room events).
7. **Replicas per shard**: **1** (High availability failover).
8. **Subnet group**: Select VPC private subnets.
9. **Security Group**: Allow inbound port `6379` from ECS backend security group.
10. Click **"Create"**.

---

### Step 4: Issue Free SSL/TLS Certificate in AWS Certificate Manager (ACM)
1. Open **AWS Certificate Manager (ACM)** in `us-east-1`.
2. Click **"Request a certificate"** $\rightarrow$ Select **"Request a public certificate"**.
3. **Fully qualified domain name**: `api.live2030.com` and `*.live2030.com`.
4. **Validation method**: **DNS validation** (Recommended).
5. Click **"Request"**.
6. In the certificate details screen, click **"Create records in Route 53"** to validate automatically in 2 minutes.

---

### Step 5: Configure Application Load Balancer (ALB)
1. Open **EC2 Console** $\rightarrow$ Click **"Load Balancers"** $\rightarrow$ **"Create load balancer"**.
2. Select **Application Load Balancer (ALB)**.
3. **Load balancer name**: `live2030-production-alb`.
4. **Scheme**: **Internet-facing**.
5. **IP address type**: **IPv4**.
6. **Network mapping**: Select all Availability Zones in your VPC.
7. **Security groups**: Inbound rules:
   - Port 80 (HTTP) $\rightarrow$ Redirect to 443 (HTTPS).
   - Port 443 (HTTPS) $\rightarrow$ Allowed from `0.0.0.0/0`.
8. **Listeners and routing**:
   - Listener HTTPS:443 $\rightarrow$ Select ACM certificate created in Step 4.
   - Forward rule: Forward `/api/*` and `/live/*` (WebSocket) to Backend Target Group (`live2030-backend-tg` on port 4000).
   - Forward rule: Forward `/` and `/*` to Admin Dashboard Target Group (`live2030-admin-tg` on port 3000).
9. Enable **Sticky Sessions (Cookie-based)** on the target group to maintain persistent WebSocket connections during live rooms.

---

### Step 6: Deploy Containers on AWS ECS (Elastic Container Service)
1. Open **Amazon Elastic Container Registry (ECR)**:
   - Create Repository 1: `live2030-backend`.
   - Create Repository 2: `live2030-admin-dashboard`.
2. Push your images:
   ```bash
   # Authenticate Docker to AWS ECR
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <YOUR_AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

   # Build & tag Backend
   docker build -t live2030-backend ./backend
   docker tag live2030-backend:latest <YOUR_AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/live2030-backend:latest
   docker push <YOUR_AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/live2030-backend:latest

   # Build & tag Admin Dashboard
   docker build -t live2030-admin ./admin_dashboard
   docker tag live2030-admin:latest <YOUR_AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/live2030-admin:latest
   docker push <YOUR_AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/live2030-admin:latest
   ```
3. Open **ECS Console** $\rightarrow$ Create Cluster: `live2030-production-cluster` (Infrastructure: **AWS Fargate**).
4. Create **Task Definition** for Backend:
   - Task CPU: `1 vCPU`.
   - Task Memory: `2 GB`.
   - Container Port: `4000`.
   - Environment Variables:
     - `DATABASE_URL`: `postgresql://postgres:<PASSWORD>@<RDS_ENDPOINT>:5432/live2030?schema=public`
     - `REDIS_URL`: `redis://<ELASTICACHE_CONFIGURATION_ENDPOINT>:6379`
     - `AGORA_APP_ID`: `95efa72862664489bcdf5c10451bef33`
     - `AGORA_APP_CERTIFICATE`: `507f24e08cdd417286848f752eb237af`
     - `JWT_SECRET`: `<YOUR_256BIT_SECRET>`
5. Create Service: `live2030-backend-service` $\rightarrow$ Target Group: `live2030-backend-tg`.
6. Autoscaling Policy: Minimum tasks: `2`, Maximum tasks: `50`, Target: `65% Average CPU Utilization`.

---

## 3. Estimated AWS Monthly Operating Cost

| AWS Resource | Monthly Estimation |
| :--- | :--- |
| **AWS Fargate (Backend & Admin)** (2 tasks 24/7) | ~$75.00 / month |
| **Amazon RDS PostgreSQL (`db.t4g.medium` Multi-AZ)** | ~$110.00 / month |
| **Amazon ElastiCache Redis (`cache.t4g.medium`)** | ~$68.00 / month |
| **Application Load Balancer (ALB)** | ~$22.00 / month |
| **Amazon S3 + CloudFront CDN** | ~$15.00 / month |
| **Total Estimated AWS Foundation Cost** | **~$290.00 / month** |

*Note: Agora RTC audio/video streaming pricing is billed directly through your Agora developer account under their standard pay-as-you-go usage pricing.*
