DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'add_creator_as_admin()','auto_verify_special_accounts()','award_earnings_on_post_reaction()',
    'award_earnings_on_video_like()','award_earnings_on_video_view()','check_username_change()',
    'check_username_insert()','delete_expired_phone_codes()','delete_expired_posts()',
    'delete_expired_stories()','delete_expired_two_factor_codes()','handle_new_user()',
    'handle_updated_at()','notify_on_comment()','notify_on_comment_mention()','notify_on_follow()',
    'notify_on_post_mention()','notify_on_post_reaction()','update_channel_follower_count()',
    'update_chat_settings_updated_at()','update_page_profiles_updated_at()',
    'update_security_settings_updated_at()','update_two_factor_auth_updated_at()',
    'update_user_locations_updated_at()','update_user_presence_updated_at()','update_viewer_count()'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', f);
  END LOOP;
  FOREACH f IN ARRAY ARRAY[
    'check_action_limit(uuid,text,integer)','generate_2fa_secret()','has_role(uuid,text)',
    'is_channel_admin(uuid,uuid)','is_channel_follower(uuid,uuid)','is_group_admin(uuid,uuid)',
    'is_group_creator(uuid,uuid)','is_group_member(uuid,uuid)','is_super_admin()','is_user_suspended(uuid)'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated, service_role', f);
  END LOOP;
END $$;