/* United Services — Supabase config
 *
 * The anon key is *meant* to be public — it can only do what Row Level
 * Security in supabase/schema.sql lets it do (insert leads; nothing else).
 * So shipping it in the browser is safe by design.
 *
 * Replace these two placeholders with the values from your Supabase project:
 *   Project → Settings → API → Project URL
 *   Project → Settings → API → Project API keys → anon public
 */
window.USR_CONFIG = {
  SUPABASE_URL: 'https://murjqizyaphgizgbkhlm.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11cmpxaXp5YXBoZ2l6Z2JraGxtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMTAxNzgsImV4cCI6MjA5Nzg4NjE3OH0.a7E1T5xgTx5dPg3VqIMotdOPIdF4A-w1CxzkLM3y1Ow'
};

(function () {
  'use strict';
  var c = window.USR_CONFIG;
  var ready = c.SUPABASE_URL.indexOf('REPLACE_ME') === -1 &&
              c.SUPABASE_ANON_KEY.indexOf('REPLACE_ME') === -1 &&
              typeof window.supabase !== 'undefined';
  window.usrSupabase = ready
    ? window.supabase.createClient(c.SUPABASE_URL, c.SUPABASE_ANON_KEY)
    : null;
  window.usrRef = function (prefix) {
    return prefix + '-' + Math.floor(100000 + Math.random() * 899999);
  };
})();
