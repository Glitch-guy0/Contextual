-- debit-credits.lua
-- Atomic credit debit and initial balance grant
-- KEYS[1]: credits:{userId}
-- ARGV[1]: debit_amount (number as string, e.g. "0.5")
-- ARGV[2]: default_grant (number as string, e.g. "10.0")
-- ARGV[3]: ttl_seconds (number as string, e.g. "172800")

local current = redis.call('GET', KEYS[1])
local balance

if not current then
    balance = tonumber(ARGV[2])
else
    balance = tonumber(current)
end

local cost = tonumber(ARGV[1])

if balance < cost then
    -- 0: failure (insufficient credits)
    return {0, tostring(balance), tostring(cost)}
end

balance = balance - cost
redis.call('SET', KEYS[1], tostring(balance), 'EX', tonumber(ARGV[3]))

-- 1: success, remaining balance, cost debited
return {1, tostring(balance), tostring(cost)}
