# Plant-E-Tree Production Deployment Guide

## Prerequisites

1. Node.js 18+ installed on production server
2. MongoDB instance set up and accessible
3. Domain name configured with SSL certificate
4. Razorpay production account and API keys
5. PM2 or similar process manager for Node.js

## Deployment Steps

1. **Environment Setup**
   ```bash
   # Copy production environment file
   cp .env.production .env
   
   # Edit with actual production values
   nano .env
   ```

2. **Database Setup**
   - Set up MongoDB instance
   - Configure firewall to allow only application server IP
   - Create database user with minimal required permissions
   - Update MONGODB_URI in .env with production credentials

3. **Application Deployment**
   ```bash
   # Install production dependencies
   npm install --production
   
   # Start with PM2
   pm2 start npm --name "plante-tree" -- run start:prod
   ```

4. **SSL/TLS Configuration**
   - Install SSL certificate
   - Configure reverse proxy (Nginx/Apache)
   - Update CLIENT_ORIGIN in .env

5. **Razorpay Configuration**
   - Replace test keys with production keys
   - Configure webhook URLs
   - Update payment callback URLs

6. **Security Checklist**
   - [ ] Production MongoDB credentials set
   - [ ] Strong JWT_SECRET configured
   - [ ] Strong SESSION_SECRET configured
   - [ ] Production Razorpay keys set
   - [ ] SSL/TLS enabled
   - [ ] Firewall configured
   - [ ] CORS origins restricted
   - [ ] Rate limiting enabled
   - [ ] Security headers configured

7. **Monitoring Setup**
   - Set up PM2 monitoring
   - Configure application logging
   - Set up MongoDB monitoring
   - Configure error tracking (e.g., Sentry)

8. **Backup Configuration**
   - Set up MongoDB backups
   - Configure log rotation
   - Document recovery procedures

## Post-Deployment Verification

1. **Security Tests**
   - Run security headers check
   - Verify SSL configuration
   - Test CORS restrictions
   - Verify rate limiting

2. **Functionality Tests**
   - Test user registration/login
   - Verify payment flow with test transaction
   - Check all CRUD operations
   - Test WebSocket connections

3. **Performance Tests**
   - Check response times
   - Verify database query performance
   - Test under expected load

## Maintenance

1. **Regular Tasks**
   - Monitor error logs
   - Check system resources
   - Review security updates
   - Backup verification

2. **Update Procedure**
   ```bash
   # Pull latest changes
   git pull origin main
   
   # Install dependencies
   npm install --production
   
   # Restart application
   pm2 restart plante-tree
   ```

3. **Rollback Procedure**
   ```bash
   # Switch to last stable version
   git checkout <last-stable-tag>
   
   # Install dependencies
   npm install --production
   
   # Restart application
   pm2 restart plante-tree
   ```

## Emergency Contacts

- System Administrator: [Add contact]
- Database Administrator: [Add contact]
- Payment Gateway Support: Razorpay support
- Domain/SSL Provider: [Add contact]

## Documentation

- API Documentation: [Add link]
- Database Schema: [Add link]
- Network Architecture: [Add link]
- Recovery Procedures: [Add link]