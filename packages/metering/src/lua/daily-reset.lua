-- daily-reset.lua
-- Idempotent daily credit reset script using Redis SET NX lock
-- KEYS[1]: reset:{date}:{userId}
-- KEYS[2]: credits:{userId}
-- ARGV[1]: default_grant (e.g. 10.0)
-- ARGV[2]: lock_ttl_seconds (e.g. 86400)
-- ARGV[3]: balance_ttl_seconds (e.g. 172800)

local locked = redis.call('SET', KEYS[1], '1', 'NX', 'EX', tonumber(ARGV[2]))

if not locked then
    local current = redis.call('GET', KEYS[2]) or ARGV[1]
    return {0, tostring(current), "0"}
end

local old_balance_str = redis.call('GET', KEYS[2])
local old_balance
if not old_balance_str then
    old_balance = tonumber(ARGV[1])
else
    old_balance = tonumber(old_balance_str)
end

local expired = math.max(0, old_balance)

redis.call('SET', KEYS[2], ARGV[1], 'EX', tonumber(ARGV[3]))

return {1, ARGV[1], tostring(expired)}
