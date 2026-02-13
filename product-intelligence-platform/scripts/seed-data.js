#!/usr/bin/env node
/**
 * Data Seeding Script for Product Intelligence Platform
 * 
 * Generates realistic product usage data across multiple organizations
 * with different usage patterns.
 * 
 * Usage:
 *   node scripts/seed-data.js --org=org_alpha --users=100 --months=3
 *   node scripts/seed-data.js --all --users=150 --months=3
 */

const https = require('http');
require('dotenv').config();

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const EVENTS_ENDPOINT = '/track';

// Parse CLI arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
    const [key, value] = arg.replace('--', '').split('=');
    acc[key] = value;
    return acc;
}, {});

// Configuration
const CONFIG = {
    org: args.org || null,
    all: args.all !== undefined,
    users: parseInt(args.users) || 100,
    months: parseInt(args.months) || 3,
    batchSize: parseInt(args.batch) || 50,
    delay: parseInt(args.delay) || 100 // ms between batches
};

// Event Types with weights (higher = more frequent)
const EVENT_TYPES = {
    page_view: { weight: 40, hasRevenue: false },
    sign_up: { weight: 8, hasRevenue: false },
    login: { weight: 25, hasRevenue: false },
    feature_used: { weight: 20, hasRevenue: false },
    purchase_completed: { weight: 5, hasRevenue: true },
    subscription_started: { weight: 3, hasRevenue: true },
    subscription_renewed: { weight: 4, hasRevenue: true },
    error_occurred: { weight: 2, hasRevenue: false },
    churned: { weight: 1, hasRevenue: false }
};

// Organization-specific patterns
const ORG_PATTERNS = {
    org_alpha: {
        name: 'Alpha SaaS Inc.',
        industry: 'B2B SaaS',
        avgPrice: 99,
        plans: ['starter', 'pro', 'enterprise'],
        features: ['dashboard', 'reports', 'export_csv', 'api_access', 'team_management'],
        errorCodes: ['AUTH_FAILED', 'RATE_LIMIT', 'INTEGRATION_ERROR'],
        sources: ['organic', 'referral', 'linkedin', 'google_ads'],
        growthPattern: 'steady', // steady growth
        churnRate: 0.02
    },
    org_beta: {
        name: 'Beta Commerce',
        industry: 'E-commerce',
        avgPrice: 45,
        plans: ['basic', 'premium'],
        features: ['cart', 'checkout', 'wishlist', 'reviews', 'recommendations'],
        errorCodes: ['PAYMENT_TIMEOUT', 'INVENTORY_ERROR', 'SHIPPING_FAILED'],
        sources: ['organic', 'facebook', 'instagram', 'email'],
        growthPattern: 'spike', // holiday spike pattern
        churnRate: 0.05
    },
    org_gamma: {
        name: 'Gamma Learning',
        industry: 'EdTech',
        avgPrice: 29,
        plans: ['free', 'student', 'teacher', 'institution'],
        features: ['courses', 'quizzes', 'certificates', 'live_sessions', 'progress_tracking'],
        errorCodes: ['VIDEO_BUFFER', 'QUIZ_SUBMIT_FAILED', 'CERTIFICATE_GEN_ERROR'],
        sources: ['organic', 'school_referral', 'social', 'word_of_mouth'],
        growthPattern: 'seasonal', // academic calendar
        churnRate: 0.08
    },
    org_test: {
        name: 'Test Organization',
        industry: 'Development',
        avgPrice: 50,
        plans: ['test_plan'],
        features: ['test_feature'],
        errorCodes: ['TEST_ERROR'],
        sources: ['test'],
        growthPattern: 'steady',
        churnRate: 0.01
    }
};

// Utility functions
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max) => Math.random() * (max - min) + min;
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const weightedChoice = (items) => {
    const totalWeight = Object.values(items).reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;
    for (const [name, config] of Object.entries(items)) {
        random -= config.weight;
        if (random <= 0) return name;
    }
    return Object.keys(items)[0];
};

// Generate user IDs for an org
const generateUsers = (orgId, count) => {
    const users = [];
    for (let i = 0; i < count; i++) {
        users.push(`${orgId}_user_${String(i + 1).padStart(4, '0')}`);
    }
    return users;
};

// Calculate daily activity multiplier based on growth pattern
const getActivityMultiplier = (pattern, dayOfYear, totalDays) => {
    const progress = dayOfYear / totalDays;
    
    switch (pattern) {
        case 'steady':
            // Gradual increase over time
            return 0.5 + (progress * 0.8);
        case 'spike':
            // Spike around day 45-60 (mid-Feb for holiday sales)
            const spikeDays = dayOfYear >= 45 && dayOfYear <= 60;
            return spikeDays ? 2.5 : (0.6 + progress * 0.4);
        case 'seasonal':
            // Lower in mid-months (breaks), higher at start/end
            const monthProgress = (dayOfYear % 30) / 30;
            const isBreak = monthProgress > 0.4 && monthProgress < 0.6;
            return isBreak ? 0.3 : (0.7 + progress * 0.5);
        default:
            return 1;
    }
};

// Generate a single event
const generateEvent = (orgId, userId, eventName, timestamp, orgPattern) => {
    const event = {
        org_id: orgId,
        user_id: userId,
        event_name: eventName,
        timestamp: timestamp.toISOString(),
        properties: {}
    };

    // Add event-specific properties
    switch (eventName) {
        case 'page_view':
            event.properties.page = randomChoice(['/', '/pricing', '/features', '/dashboard', '/settings']);
            event.properties.source = randomChoice(orgPattern.sources);
            break;
        case 'sign_up':
            event.properties.source = randomChoice(orgPattern.sources);
            event.properties.plan = randomChoice(orgPattern.plans);
            break;
        case 'login':
            event.properties.method = randomChoice(['email', 'google', 'sso']);
            break;
        case 'feature_used':
            event.properties.feature = randomChoice(orgPattern.features);
            event.properties.duration_seconds = randomInt(5, 300);
            break;
        case 'purchase_completed':
            const price = orgPattern.avgPrice * randomFloat(0.5, 2);
            event.properties.price = Math.round(price * 100) / 100;
            event.properties.currency = 'USD';
            event.properties.plan = randomChoice(orgPattern.plans);
            break;
        case 'subscription_started':
            event.properties.plan = randomChoice(orgPattern.plans);
            event.properties.price = orgPattern.avgPrice;
            event.properties.billing_cycle = randomChoice(['monthly', 'annual']);
            break;
        case 'subscription_renewed':
            event.properties.plan = randomChoice(orgPattern.plans);
            event.properties.price = orgPattern.avgPrice;
            event.properties.renewal_count = randomInt(1, 12);
            break;
        case 'error_occurred':
            event.properties.error_code = randomChoice(orgPattern.errorCodes);
            event.properties.severity = randomChoice(['low', 'medium', 'high']);
            break;
        case 'churned':
            event.properties.reason = randomChoice(['price', 'competitor', 'no_value', 'technical']);
            event.properties.lifetime_days = randomInt(7, 365);
            break;
    }

    return event;
};

// Post event to API
const postEvent = (event) => {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(event);
        const url = new URL(API_BASE);
        
        const options = {
            hostname: url.hostname,
            port: url.port || 3000,
            path: EVENTS_ENDPOINT,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({ success: true, event });
                } else {
                    resolve({ success: false, event, error: body });
                }
            });
        });

        req.on('error', (e) => resolve({ success: false, event, error: e.message }));
        req.write(data);
        req.end();
    });
};

// Sleep utility
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Main generation function for a single organization
const generateOrgData = async (orgId, userCount, months) => {
    const pattern = ORG_PATTERNS[orgId];
    if (!pattern) {
        console.error(`Unknown organization: ${orgId}`);
        return { total: 0, success: 0, failed: 0 };
    }

    console.log(`\n📊 Generating data for ${pattern.name} (${orgId})`);
    console.log(`   Industry: ${pattern.industry}`);
    console.log(`   Users: ${userCount}`);
    console.log(`   Months: ${months}`);
    console.log(`   Pattern: ${pattern.growthPattern}`);

    const users = generateUsers(orgId, userCount);
    const startDate = new Date('2026-01-01T00:00:00Z');
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + months);

    const events = [];
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    
    // Generate events day by day
    let currentDate = new Date(startDate);
    let dayIndex = 0;

    while (currentDate < endDate) {
        const multiplier = getActivityMultiplier(pattern.growthPattern, dayIndex, totalDays);
        const activeUsersToday = Math.floor(userCount * randomFloat(0.1, 0.4) * multiplier);
        const dailyUsers = users.slice(0, activeUsersToday);

        for (const userId of dailyUsers) {
            // Each active user generates 1-10 events per day
            const eventsPerUser = randomInt(1, 10);
            
            for (let e = 0; e < eventsPerUser; e++) {
                const eventName = weightedChoice(EVENT_TYPES);
                
                // Add some hour variation
                const eventTime = new Date(currentDate);
                eventTime.setHours(randomInt(6, 23));
                eventTime.setMinutes(randomInt(0, 59));
                eventTime.setSeconds(randomInt(0, 59));

                events.push(generateEvent(orgId, userId, eventName, eventTime, pattern));
            }
        }

        currentDate.setDate(currentDate.getDate() + 1);
        dayIndex++;
    }

    console.log(`   Generated ${events.length} events locally`);
    console.log(`   Sending to API in batches of ${CONFIG.batchSize}...`);

    // Send events in batches
    let success = 0;
    let failed = 0;
    
    for (let i = 0; i < events.length; i += CONFIG.batchSize) {
        const batch = events.slice(i, i + CONFIG.batchSize);
        const results = await Promise.all(batch.map(postEvent));
        
        success += results.filter(r => r.success).length;
        failed += results.filter(r => !r.success).length;

        // Progress indicator
        const progress = Math.round(((i + batch.length) / events.length) * 100);
        process.stdout.write(`\r   Progress: ${progress}% (${i + batch.length}/${events.length})`);

        await sleep(CONFIG.delay);
    }

    console.log(`\n   ✅ Success: ${success} | ❌ Failed: ${failed}`);
    
    return { total: events.length, success, failed };
};

// Main entry point
const main = async () => {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║     Product Intelligence Platform - Data Seeder          ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log(`\nConfiguration:`);
    console.log(`  API Base: ${API_BASE}`);
    console.log(`  Users per org: ${CONFIG.users}`);
    console.log(`  Months of data: ${CONFIG.months}`);
    console.log(`  Batch size: ${CONFIG.batchSize}`);

    const orgsToSeed = CONFIG.all 
        ? Object.keys(ORG_PATTERNS).filter(o => o !== 'org_test')
        : [CONFIG.org];

    if (!CONFIG.all && !CONFIG.org) {
        console.error('\n❌ Error: Please specify --org=<org_id> or --all');
        console.log('\nAvailable organizations:');
        Object.entries(ORG_PATTERNS).forEach(([id, p]) => {
            console.log(`  ${id}: ${p.name} (${p.industry})`);
        });
        process.exit(1);
    }

    const results = { total: 0, success: 0, failed: 0 };

    for (const orgId of orgsToSeed) {
        const result = await generateOrgData(orgId, CONFIG.users, CONFIG.months);
        results.total += result.total;
        results.success += result.success;
        results.failed += result.failed;
    }

    console.log('\n════════════════════════════════════════════════════════════');
    console.log('                        SUMMARY');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`  Total Events Generated: ${results.total}`);
    console.log(`  Successfully Sent: ${results.success}`);
    console.log(`  Failed: ${results.failed}`);
    console.log(`  Success Rate: ${((results.success / results.total) * 100).toFixed(2)}%`);
    console.log('════════════════════════════════════════════════════════════\n');
};

main().catch(console.error);
