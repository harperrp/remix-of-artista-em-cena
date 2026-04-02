CREATE POLICY "leads_delete_commercial_admin"
ON public.leads FOR DELETE
TO authenticated
USING (
  public.is_member_of_org(auth.uid(), organization_id)
  AND (public.has_org_role(auth.uid(), organization_id, 'comercial') 
    OR public.has_org_role(auth.uid(), organization_id, 'admin'))
);