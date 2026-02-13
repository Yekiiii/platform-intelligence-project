const perfLogger = (req, res, next) => {
    const start = process.hrtime();
    
    // Initialize metrics container for downstream controllers to populate
    res.locals.metrics = {
        dbQueryTime: 0,
        cacheHit: false
    };

    res.on('finish', () => {
        const diff = process.hrtime(start);
        const totalTime = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(3); // milliseconds with precision

        const logEntry = {
            timestamp: new Date().toISOString(),
            level: 'info',
            type: 'performance',
            req: {
                method: req.method,
                path: req.originalUrl,
                query: req.query
            },
            res: {
                statusCode: res.statusCode
            },
            metrics: {
                total_duration_ms: parseFloat(totalTime),
                db_query_time_ms: res.locals.metrics.dbQueryTime,
                cache_hit: res.locals.metrics.cacheHit,
                // LLM Metrics (if present)
                ...(res.locals.metrics.llm_request_id && {
                    llm_request_id: res.locals.metrics.llm_request_id,
                    llm_latency_ms: res.locals.metrics.llm_latency_ms,
                    llm_tokens_input: res.locals.metrics.llm_tokens_input,
                    llm_tokens_output: res.locals.metrics.llm_tokens_output,
                    llm_cost_usd: res.locals.metrics.llm_cost_usd,
                    llm_model: res.locals.metrics.llm_model
                })
            }
        };

        // Log to stdout (can be piped to ELK/CloudWatch)
        console.log(JSON.stringify(logEntry));
    });

    next();
};

module.exports = perfLogger;
