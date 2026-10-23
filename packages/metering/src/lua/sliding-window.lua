-- sliding-window.lua
-- Sliding window rate limiter using Redis Sorted Sets
-- KEYS[1]: rl:{userId}
-- ARGV[1]: now_ms (current millisecond epoch timestamp)
-- ARGV[2]: window_ms (rolling window duration in ms, e.g. 1000)
-- ARGV[3]: max_requests (maximum admitted requests, e.g. 5)
-- ARGV[4]: request_id (unique string now_ms:rand)

local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local max_requests = tonumber(ARGV[3])
local clear_before = now - window

-- Prune requests outside rolling window
redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, clear_before)

local current_count = redis.call('ZCARD', KEYS[1])

if current_count >= max_requests then
    -- Rate limit exceeded.
    -- Fetch oldest entry in window to calculate exact retry-after seconds
    local oldest = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
    local retry_after = 1
    if #oldest > 0 then
        local oldest_ts = tonumber(oldest[2])
        local remaining_window_ms = (oldest_ts + window) - now
        if remaining_window_ms > 0 then
            retry_after = math.ceil(remaining_window_ms / 1000)
        end
    end
    return {0, current_count, retry_after}
end

-- Admit request
redis.call('ZADD', KEYS[1], now, ARGV[4])
redis.call('EXPIRE', KEYS[1], 2)

return {1, max_requests - (current_count + 1), 0}
