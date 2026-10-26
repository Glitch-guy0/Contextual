export const REFUND_SCRIPT_LUA = `
local already_refunded = redis.call('HGET', KEYS[2], 'refunded')
if already_refunded == '1' then
  local current_bal = tonumber(redis.call('GET', KEYS[1]) or '10.0')
  return {0, current_bal}
end

local current_bal = tonumber(redis.call('GET', KEYS[1]) or '10.0')
local new_bal = current_bal + tonumber(ARGV[1])
redis.call('SET', KEYS[1], tostring(new_bal))
redis.call('HSET', KEYS[2], 'refunded', '1', 'failure_reason', ARGV[2])

return {1, new_bal}
`;

export const COMPENSATE_ON_FAILURE_LUA = REFUND_SCRIPT_LUA;
