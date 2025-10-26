import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Action {
  type: string;
  params: Record<string, any>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { exec_id } = await req.json();
    
    console.log(`[ops-runner] Starting execution: ${exec_id}`);

    // Get execution details
    const { data: execution, error: execError } = await supabase
      .from('ops_executions')
      .select('*, ops_playbooks!inner(actions)')
      .eq('id', exec_id)
      .single();

    if (execError || !execution) {
      throw new Error(`Execution not found: ${exec_id}`);
    }

    const actions = execution.ops_playbooks.actions as Action[];
    const results: any[] = [];

    // Execute each action sequentially
    for (const action of actions) {
      try {
        console.log(`[ops-runner] Executing action: ${action.type}`, action.params);
        
        const result = await executeAction(action, supabase);
        results.push({ action: action.type, status: 'success', result });
        
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[ops-runner] Action failed: ${action.type}`, errorMsg);
        
        results.push({ action: action.type, status: 'failed', error: errorMsg });
        
        // Update execution as failed
        await supabase
          .from('ops_executions')
          .update({
            status: 'failed',
            finished_at: new Date().toISOString(),
            result: { actions: results, error: errorMsg }
          })
          .eq('id', exec_id);
        
        return new Response(
          JSON.stringify({ success: false, exec_id, error: errorMsg }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update execution as succeeded
    await supabase
      .from('ops_executions')
      .update({
        status: 'succeeded',
        finished_at: new Date().toISOString(),
        result: { actions: results }
      })
      .eq('id', exec_id);

    console.log(`[ops-runner] Execution completed: ${exec_id}`);

    return new Response(
      JSON.stringify({ success: true, exec_id, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ops-runner] Fatal error:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ success: false, error: errorMsg }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function executeAction(action: Action, supabase: any): Promise<any> {
  switch (action.type) {
    case 'realtime.reconnect':
      return await realtimeReconnect(action.params);
    
    case 'cache.invalidate':
      return await cacheInvalidate(action.params, supabase);
    
    case 'deploy.rollback':
      return await deployRollback(action.params);
    
    case 'queue.pause':
      return await queuePause(action.params);
    
    case 'notify':
      return await createNotification(action.params, supabase);
    
    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}

async function realtimeReconnect(params: any): Promise<any> {
  console.log(`[realtime.reconnect] Max attempts: ${params.maxAttempts}`);
  
  // Simulate reconnection attempts
  for (let i = 0; i < params.maxAttempts; i++) {
    console.log(`[realtime.reconnect] Attempt ${i + 1}/${params.maxAttempts}`);
    await new Promise(resolve => setTimeout(resolve, params.backoffMs || 1000));
  }
  
  return { reconnected: true, attempts: params.maxAttempts };
}

async function cacheInvalidate(params: any, supabase: any): Promise<any> {
  console.log(`[cache.invalidate] Keys: ${params.keys.join(', ')}`);
  
  // Delete cache entries
  const { error } = await supabase
    .from('system_cache')
    .delete()
    .in('key', params.keys);
  
  if (error) throw error;
  
  return { invalidated: params.keys };
}

async function deployRollback(params: any): Promise<any> {
  console.log(`[deploy.rollback] Service: ${params.service}, To: ${params.to}`);
  
  // This would integrate with deployment system
  // For now, just log the intent
  return { 
    service: params.service, 
    rollback_to: params.to,
    status: 'simulated' 
  };
}

async function queuePause(params: any): Promise<any> {
  console.log(`[queue.pause] Queue: ${params.queue}`);
  
  // This would integrate with queue system
  return { queue: params.queue, paused: true };
}

async function createNotification(params: any, supabase: any): Promise<any> {
  console.log(`[notify] ${params.level}: ${params.title}`);
  
  const { error } = await supabase
    .from('notifications')
    .insert({
      scope: 'master',
      level: params.level,
      title: params.title,
      body: params.body,
      meta: params.meta || {}
    });
  
  if (error) throw error;
  
  return { notified: true };
}
