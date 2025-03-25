import React, { useState, useEffect, useRef } from 'react';
import { 
  HardDriveDownload, 
  Upload, 
  FolderPlus, 
  Search, 
  Grid, 
  List, 
  LogOut, 
  Loader2,
  Folder,
  File,
  ChevronRight,
  MoreVertical,
  Lock,
  Unlock,
  Copy,
  Download,
  Pencil,
  Trash2,
  User
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';

interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  is_private: boolean;
  user_id: string;
  owner_id: string;
}

interface File {
  id: string;
  name: string;
  size: number;
  type: string;
  created_at: string;
  url: string;
  is_private: boolean;
  folder_id: string | null;
  user_id: string;
  owner_id: string;
}

interface MenuPosition {
  x: number;
  y: number;
}

interface UserInfo {
  id: string;
  email: string;
}

const Dashboard: React.FC = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<Folder[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [userName, setUserName] = useState('');
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ id: string; type: 'folder' | 'file' } | null>(null);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCurrentFolder();
    loadUserInfo();

    const handleClickOutside = (e: MouseEvent) => {
      if (!e.target || !(e.target as Element).closest('.context-menu')) {
        setMenuPosition(null);
        setSelectedItem(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [currentFolder]);

  const loadUserInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser({ id: user.id, email: user.email || '' });
        
        const { data: userData } = await supabase
          .from('users')
          .select('username')
          .eq('id', user.id)
          .single();
        
        if (userData) {
          setUserName(userData.username);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar informações do usuário:', error);
    }
  };

  const loadCurrentFolder = async () => {
    try {
      setIsLoading(true);
      
      let foldersQuery = supabase
        .from('folders')
        .select('*')
        .order('name');

      if (currentFolder === null) {
        foldersQuery = foldersQuery.is('parent_id', null);
      } else {
        foldersQuery = foldersQuery.eq('parent_id', currentFolder);
      }

      const { data: foldersData, error: foldersError } = await foldersQuery;

      if (foldersError) throw foldersError;
      setFolders(foldersData || []);

      let filesQuery = supabase
        .from('files')
        .select('*')
        .order('name');

      if (currentFolder === null) {
        filesQuery = filesQuery.is('folder_id', null);
      } else {
        filesQuery = filesQuery.eq('folder_id', currentFolder);
      }

      const { data: filesData, error: filesError } = await filesQuery;

      if (filesError) throw filesError;
      setFiles(filesData || []);

      if (currentFolder) {
        const path: Folder[] = [];
        let currentId = currentFolder;
        
        while (currentId) {
          const { data: folder } = await supabase
            .from('folders')
            .select('*')
            .eq('id', currentId)
            .single();
          
          if (folder) {
            path.unshift(folder);
            currentId = folder.parent_id;
          } else {
            break;
          }
        }
        
        setFolderPath(path);
      } else {
        setFolderPath([]);
      }
    } catch (error) {
      console.error('Erro ao carregar pasta:', error);
      toast.error('Erro ao carregar conteúdo da pasta');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('folders')
        .insert([
          {
            name: newFolderName.trim(),
            parent_id: currentFolder,
            user_id: user.id,
            owner_id: user.id
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setFolders([...folders, data]);
      setIsCreatingFolder(false);
      setNewFolderName('');
      toast.success('Pasta criada com sucesso!');
    } catch (error) {
      console.error('Erro ao criar pasta:', error);
      toast.error('Erro ao criar pasta');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Usuário não autenticado');
      setIsUploading(false);
      return;
    }

    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError, data } = await supabase.storage
          .from('files')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('files')
          .getPublicUrl(filePath);

        const { error: dbError } = await supabase
          .from('files')
          .insert([
            {
              name: file.name,
              size: file.size,
              type: file.type,
              url: publicUrl,
              folder_id: currentFolder,
              user_id: user.id,
              owner_id: user.id
            }
          ]);

        if (dbError) throw dbError;
      }

      toast.success('Arquivo(s) enviado(s) com sucesso!');
      loadCurrentFolder();
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao enviar arquivo(s)');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileDownload = async (file: File) => {
    try {
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Download iniciado!');
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
      toast.error('Erro ao baixar arquivo');
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      toast.error('Erro ao fazer logout');
      setIsLoggingOut(false);
    }
  };

  const handleMenuClick = (e: React.MouseEvent, id: string, type: 'folder' | 'file') => {
    e.stopPropagation();
    setSelectedItem({ id, type });
    setMenuPosition({ x: e.clientX, y: e.clientY });
  };

  const handleTogglePrivate = async () => {
    if (!selectedItem || !currentUser) return;

    try {
      const table = selectedItem.type === 'folder' ? 'folders' : 'files';
      const item = selectedItem.type === 'folder' 
        ? folders.find(f => f.id === selectedItem.id)
        : files.find(f => f.id === selectedItem.id);

      if (!item) return;

      // Se o item está bloqueado e o usuário atual não é o dono
      if (item.is_private && item.owner_id !== currentUser.id) {
        // Buscar o email do dono
        const { data: ownerData, error: ownerError } = await supabase
          .from('users')
          .select('email')
          .eq('id', item.owner_id)
          .single();

        if (ownerError) throw ownerError;

        toast.error(`Este item só pode ser desbloqueado pelo usuário: ${ownerData.email}`, {
          autoClose: 5000
        });
        return;
      }

      const { error } = await supabase
        .from(table)
        .update({ 
          is_private: !item.is_private,
          owner_id: !item.is_private ? currentUser.id : item.owner_id // Atualiza o owner_id apenas ao bloquear
        })
        .eq('id', selectedItem.id);

      if (error) throw error;

      toast.success(item.is_private ? 'Item desbloqueado!' : 'Item bloqueado!');
      loadCurrentFolder();
    } catch (error) {
      console.error('Erro ao alterar privacidade:', error);
      toast.error('Erro ao alterar privacidade do item');
    } finally {
      setMenuPosition(null);
      setSelectedItem(null);
    }
  };

  const handleCopy = () => {
    if (!selectedItem) return;

    const item = selectedItem.type === 'folder'
      ? folders.find(f => f.id === selectedItem.id)
      : files.find(f => f.id === selectedItem.id);

    if (item) {
      navigator.clipboard.writeText(item.name);
      toast.success('Nome copiado para a área de transferência!');
    }

    setMenuPosition(null);
    setSelectedItem(null);
  };

  const handleRename = () => {
    if (!selectedItem) return;

    const item = selectedItem.type === 'folder'
      ? folders.find(f => f.id === selectedItem.id)
      : files.find(f => f.id === selectedItem.id);

    if (item) {
      if (selectedItem.type === 'file') {
        const extension = item.name.split('.').pop();
        const nameWithoutExtension = item.name.slice(0, -(extension?.length || 0) - 1);
        setNewName(nameWithoutExtension);
      } else {
        setNewName(item.name);
      }
      setIsRenaming(true);
      setMenuPosition(null);
    }
  };

  const confirmRename = async () => {
    if (!selectedItem || !newName.trim()) return;

    try {
      const table = selectedItem.type === 'folder' ? 'folders' : 'files';
      let finalName = newName.trim();

      if (selectedItem.type === 'file') {
        const file = files.find(f => f.id === selectedItem.id);
        if (file) {
          const extension = file.name.split('.').pop();
          finalName = `${newName.trim()}.${extension}`;
        }
      }

      const { error } = await supabase
        .from(table)
        .update({ name: finalName })
        .eq('id', selectedItem.id);

      if (error) throw error;

      toast.success('Item renomeado com sucesso!');
      loadCurrentFolder();
    } catch (error) {
      console.error('Erro ao renomear:', error);
      toast.error('Erro ao renomear item');
    } finally {
      setIsRenaming(false);
      setSelectedItem(null);
      setNewName('');
    }
  };

  const handleDelete = () => {
    if (!selectedItem) return;
    setIsDeleting(true);
    setMenuPosition(null);
  };

  const confirmDelete = async () => {
    if (!selectedItem) return;

    try {
      const table = selectedItem.type === 'folder' ? 'folders' : 'files';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', selectedItem.id);

      if (error) throw error;

      toast.success('Item excluído com sucesso!');
      loadCurrentFolder();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir item');
    } finally {
      setIsDeleting(false);
      setSelectedItem(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gray-900 relative">
      {(isLoggingOut || isUploading) && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-xl shadow-xl flex flex-col items-center">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
            <p className="text-white text-lg">{isLoggingOut ? 'Saindo...' : 'Enviando arquivo(s)...'}</p>
          </div>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        multiple
      />

      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <HardDriveDownload className="w-7 h-7 text-blue-500" />
              <h1 className="text-xl font-semibold text-white logo-text">nexo drive</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-gray-300">
                <User className="w-4 h-4" />
                <span className="text-sm">{userName}</span>
              </div>
              <button 
                onClick={handleLogout}
                className="p-1.5 hover:bg-gray-700 rounded-full text-gray-300 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Sair"
                disabled={isLoggingOut}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setIsCreatingFolder(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Nova Pasta</span>
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-4 h-4" />
              <span>Upload</span>
            </button>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg ${viewMode === 'grid' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg ${viewMode === 'list' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 mb-3 text-gray-400 text-sm">
          <button
            onClick={() => setCurrentFolder(null)}
            className="hover:text-white transition-colors"
          >
            Meus Arquivos
          </button>
          {folderPath.map((folder, index) => (
            <React.Fragment key={folder.id}>
              <ChevronRight className="w-3.5 h-3.5" />
              <button
                onClick={() => setCurrentFolder(folder.id)}
                className="hover:text-white transition-colors"
              >
                {folder.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
        ) : folders.length === 0 && files.length === 0 ? (
          <div className="text-center py-8 bg-gray-800 rounded-xl border border-gray-700 shadow-xl">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-white mb-1">Pasta vazia</h3>
            <p className="text-gray-400 text-sm">Crie uma nova pasta ou faça upload de arquivos</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5' : 'space-y-1'}>
            {folders.map(folder => (
              <div
                key={folder.id}
                onClick={() => setCurrentFolder(folder.id)}
                className={`
                  ${viewMode === 'grid'
                    ? 'bg-gray-800 py-3 px-2 rounded-lg border border-gray-700 hover:border-blue-500 cursor-pointer transition-colors h-[88px] group relative'
                    : 'flex items-center space-x-3 bg-gray-800 p-2 rounded-lg border border-gray-700 hover:border-blue-500 cursor-pointer transition-colors group relative'
                  }
                `}
              >
                <div className={viewMode === 'grid' ? 'flex flex-col items-center justify-center h-full' : 'flex items-center space-x-3 flex-1'}>
                  <div className="relative">
                    <Folder className="w-8 h-8 text-blue-500 flex-shrink-0" />
                    {folder.is_private && (
                      <Lock className="absolute -top-1 -right-1 w-3.5 h-3.5 text-gray-300" />
                    )}
                  </div>
                  <div className="min-w-0 text-sm mt-2">
                    <p className={`text-white truncate ${viewMode === 'grid' ? 'text-center w-full max-w-[80px]' : ''}`}>{folder.name}</p>
                    {viewMode === 'list' && (
                      <p className="text-gray-400 text-xs">
                        Criado em {new Date(folder.created_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => handleMenuClick(e, folder.id, 'folder')}
                  className="absolute top-1 right-1 p-1 rounded-lg bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="w-4 h-4 text-gray-300" />
                </button>
              </div>
            ))}
            
            {files.map(file => (
              <div
                key={file.id}
                className={`
                  ${viewMode === 'grid'
                    ? 'bg-gray-800 py-3 px-2 rounded-lg border border-gray-700 hover:border-blue-500 cursor-pointer transition-colors h-[88px] group relative'
                    : 'flex items-center space-x-3 bg-gray-800 p-2 rounded-lg border border-gray-700 hover:border-blue-500 cursor-pointer transition-colors group relative'
                  }
                `}
              >
                <div 
                  onClick={() => handleFileDownload(file)}
                  className={viewMode === 'grid' ? 'flex flex-col items-center justify-center h-full' : 'flex items-center space-x-3 flex-1'}
                >
                  <div className="relative">
                    <File className="w-8 h-8 text-gray-400 flex-shrink-0" />
                    {file.is_private && (
                      <Lock className="absolute -top-1 -right-1 w-3.5 h-3.5 text-gray-300" />
                    )}
                  </div>
                  <div className="min-w-0 text-sm mt-2">
                    <p className={`text-white truncate ${viewMode === 'grid' ? 'text-center w-full max-w-[80px]' : ''}`}>{file.name}</p>
                    {viewMode === 'list' && (
                      <div className="flex items-center space-x-2 text-gray-400 text-xs">
                        <span>{formatFileSize(file.size)}</span>
                        <span>•</span>
                        <span>{new Date(file.created_at).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => handleMenuClick(e, file.id, 'file')}
                  className="absolute top-1 right-1 p-1 rounded-lg bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="w-4 h-4 text-gray-300" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Context Menu */}
        {menuPosition && (
          <div
            className="fixed bg-gray-800 rounded-lg shadow-xl border border-gray-700 py-1 z-50 context-menu"
            style={{
              top: `${menuPosition.y}px`,
              left: `${menuPosition.x}px`,
              transform: 'translate(-100%, 0)'
            }}
          >
            <button
              onClick={handleTogglePrivate}
              className="flex items-center space-x-2 w-full px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            >
              {selectedItem && (
                selectedItem.type === 'folder' 
                  ? folders.find(f => f.id === selectedItem.id)?.is_private
                  : files.find(f => f.id === selectedItem.id)?.is_private
              ) ? (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>Desbloquear</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Bloquear</span>
                </>
              )}
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center space-x-2 w-full px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            >
              <Copy className="w-4 h-4" />
              <span>Copiar</span>
            </button>
            {selectedItem?.type === 'file' && (
              <button
                onClick={() => handleFileDownload(files.find(f => f.id === selectedItem?.id)!)}
                className="flex items-center space-x-2 w-full px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Baixar</span>
              </button>
            )}
            <button
              onClick={handleRename}
              className="flex items-center space-x-2 w-full px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            >
              <Pencil className="w-4 h-4" />
              <span>Renomear</span>
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center space-x-2 w-full px-3 py-1.5 text-sm text-red-400 hover:bg-gray-700 hover:text-red-300 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Deletar</span>
            </button>
          </div>
        )}

        {/* Create Folder Modal */}
        {isCreatingFolder && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-800 p-4 rounded-xl shadow-xl w-full max-w-sm">
              <h3 className="text-lg font-semibold text-white mb-3">Nova Pasta</h3>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Nome da pasta"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3 text-sm"
                autoFocus
              />
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setIsCreatingFolder(false);
                    setNewFolderName('');
                  }}
                  className="px-3 py-1.5 text-gray-300 hover:text-white transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateFolder}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Criar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rename Modal */}
        {isRenaming && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-800 p-4 rounded-xl shadow-xl w-full max-w-sm">
              <h3 className="text-lg font-semibold text-white mb-3">Renomear</h3>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Novo nome"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3 text-sm"
                autoFocus
              />
              {selectedItem?.type === 'file' && (
                <p className="text-gray-400 text-sm mb-3">
                  A extensão do arquivo será preservada automaticamente.
                </p>
              )}
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setIsRenaming(false);
                    setSelectedItem(null);
                    setNewName('');
                  }}
                  className="px-3 py-1.5 text-gray-300 hover:text-white transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmRename}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Renomear
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {isDeleting && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-800 p-4 rounded-xl shadow-xl w-full max-w-sm">
              <h3 className="text-lg font-semibold text-white mb-3">Confirmar exclusão</h3>
              <p className="text-gray-300 mb-4">Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.</p>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setIsDeleting(false);
                    setSelectedItem(null);
                  }}
                  className="px-3 py-1.5 text-gray-300 hover:text-white transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;