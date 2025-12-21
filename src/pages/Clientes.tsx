import { useState, useEffect, useCallback } from 'react';
import { SearchInput } from '@/components/ui/SearchInput';
import { Button } from '@/components/ui/button';
import { TablePagination } from '@/components/ui/TablePagination';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MapPin, Hash, Store, Loader2, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ImportarPdvsDialog } from '@/components/ImportarPdvsDialog';

// Mapeamento de códigos para nomes de unidades
const UNIDADES_MAP: { codigo: string; nome: string }[] = [
  { codigo: 'JZ', nome: 'Revalle Juazeiro' },
  { codigo: 'BF', nome: 'Revalle Bonfim' },
  { codigo: 'PE', nome: 'Revalle Petrolina' },
  { codigo: 'RP', nome: 'Revalle Ribeira do Pombal' },
  { codigo: 'PA', nome: 'Revalle Paulo Afonso' },
  { codigo: 'AL', nome: 'Revalle Alagoinhas' },
  { codigo: 'SE', nome: 'Revalle Serrinha' },
];

const getUnidadeNome = (codigo: string | null): string => {
  if (!codigo) return '-';
  const unidade = UNIDADES_MAP.find(u => u.codigo === codigo);
  return unidade ? unidade.nome : codigo;
};

interface Pdv {
  id: string;
  codigo: string;
  nome: string;
  bairro: string | null;
  cidade: string | null;
  endereco: string | null;
  cnpj: string | null;
  unidade: string | null;
}

export default function Clientes() {
  const { isAdmin, user } = useAuth();
  const [pdvs, setPdvs] = useState<Pdv[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [unidadeFiltro, setUnidadeFiltro] = useState<string>('todas');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch PDVs
  const fetchPdvs = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('pdvs')
        .select('*')
        .order('nome');

      // Filtro por unidade
      if (!isAdmin && user?.unidade) {
        query = query.eq('unidade', user.unidade);
      } else if (isAdmin && unidadeFiltro !== 'todas') {
        query = query.eq('unidade', unidadeFiltro);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPdvs(data || []);
    } catch (error) {
      console.error('Erro ao buscar PDVs:', error);
      toast.error('Erro ao carregar clientes');
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, user?.unidade, unidadeFiltro]);

  useEffect(() => {
    fetchPdvs();
  }, [fetchPdvs, refreshKey]);

  const handleImportSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Filter by search
  const filteredPdvs = pdvs.filter(p => 
    p.nome.toLowerCase().includes(search.toLowerCase()) ||
    p.codigo.toLowerCase().includes(search.toLowerCase()) ||
    (p.bairro && p.bairro.toLowerCase().includes(search.toLowerCase())) ||
    (p.cidade && p.cidade.toLowerCase().includes(search.toLowerCase()))
  );

  // Pagination calculations
  const totalPages = Math.ceil(filteredPdvs.length / pageSize);
  const paginatedPdvs = filteredPdvs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, pageSize, unidadeFiltro]);

  // Export functions
  const exportToCSV = () => {
    if (filteredPdvs.length === 0) {
      toast.error('Nenhum cliente para exportar');
      return;
    }

    const headers = ['Código', 'Nome', 'CNPJ', 'Endereço', 'Bairro', 'Cidade', 'Unidade'];
    const csvContent = [
      headers.join(';'),
      ...filteredPdvs.map(p => [
        p.codigo,
        p.nome,
        p.cnpj || '',
        p.endereco || '',
        p.bairro || '',
        p.cidade || '',
        getUnidadeNome(p.unidade)
      ].map(field => `"${field}"`).join(';'))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `clientes_${unidadeFiltro === 'todas' ? 'todos' : unidadeFiltro}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success(`${filteredPdvs.length} clientes exportados para CSV`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <Store className="text-primary" size={24} />
            Clientes (PDVs)
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Gerencie os pontos de venda cadastrados ({filteredPdvs.length} registros)
          </p>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <ImportarPdvsDialog onSuccess={handleImportSuccess} />
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download size={16} className="mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nome, código, bairro ou cidade..."
          className="flex-1 max-w-md"
        />
        
        {isAdmin && (
          <Select value={unidadeFiltro} onValueChange={setUnidadeFiltro}>
            <SelectTrigger className="w-[220px] h-8 text-xs">
              <MapPin size={14} className="mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Todas as Unidades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as Unidades</SelectItem>
              {UNIDADES_MAP.map(u => (
                <SelectItem key={u.codigo} value={u.codigo}>{u.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl p-4 shadow-md animate-fade-in overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="table-header">
                  <th className="text-left p-2.5 text-[11px] rounded-tl-lg">Código</th>
                  <th className="text-left p-2.5 text-[11px]">Nome</th>
                  <th className="text-left p-2.5 text-[11px]">Bairro</th>
                  <th className="text-left p-2.5 text-[11px]">Cidade</th>
                  <th className="text-left p-2.5 text-[11px]">Endereço</th>
                  <th className="text-left p-2.5 text-[11px] rounded-tr-lg">Unidade</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPdvs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      Nenhum cliente encontrado
                    </td>
                  </tr>
                ) : (
                  paginatedPdvs.map((pdv) => (
                    <tr key={pdv.id} className="border-b border-border hover:bg-muted/30">
                      <td className="p-2.5">
                        <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
                          <Hash size={12} />
                          {pdv.codigo}
                        </span>
                      </td>
                      <td className="p-2.5 font-medium text-xs">{pdv.nome}</td>
                      <td className="p-2.5 text-xs text-muted-foreground">{pdv.bairro || '-'}</td>
                      <td className="p-2.5 text-xs text-muted-foreground">{pdv.cidade || '-'}</td>
                      <td className="p-2.5 text-xs text-muted-foreground max-w-[200px] truncate">{pdv.endereco || '-'}</td>
                      <td className="p-2.5">
                        <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
                          <MapPin size={12} />
                          {getUnidadeNome(pdv.unidade)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              totalItems={filteredPdvs.length}
            />
          </>
        )}
      </div>
    </div>
  );
}
