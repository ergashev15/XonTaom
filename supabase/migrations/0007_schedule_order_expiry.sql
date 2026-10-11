-- Cancels orders a restaurant did not answer within 10 minutes, once a minute.
-- The function comes from 0006; this migration only enables the scheduler.
create extension if not exists pg_cron;

select cron.unschedule(jobid) from cron.job where jobname = 'expire-unanswered-orders';
select cron.schedule('expire-unanswered-orders', '* * * * *', 'select public.expire_unanswered_orders()');
