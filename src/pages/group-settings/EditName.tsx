import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';

export default function EditName() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (groupId) {
      loadGroupName();
    }
  }, [groupId]);

  const loadGroupName = async () => {
    if (!groupId) return;

    const { data } = await supabase
      .from('groups')
      .select('name')
      .eq('id', groupId)
      .single();

    if (data) setName(data.name);
  };

  const updateName = async () => {
    if (!name.trim() || !groupId) {
      toast({
        title: 'Nome inválido',
        description: 'Digite um nome para o grupo',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('groups')
      .update({ name: name.trim() })
      .eq('id', groupId);

    setLoading(false);

    if (error) {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Nome atualizado!',
      });
      navigate(`/group/${groupId}/settings`);
    }
  };

  return (
    <MainLayout title="Alterar Nome do Grupo">
      <div className="flex flex-col h-full">
        <div className="flex-1 p-4">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Nome do grupo
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Digite o nome do grupo"
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {name.length}/50 caracteres
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 border-t">
          <Button
            onClick={updateName}
            className="w-full"
            disabled={!name.trim() || loading}
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
