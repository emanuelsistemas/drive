import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  User,
  FolderUp,
  CheckSquare,
  Square,
  X,
  Link
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-toastify';
import UploadModal from './UploadModal';

// Maximum file size: 50MB (Supabase default limit)
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes

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

interface UploadProgress {
  fileName: string;
  progress: number;
  speed: string;
  remainingTime: string;
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
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [draggedItem, setDraggedItem] = useState<{ id: string; type: 'folder' | 'file' } | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

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

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const { items } = e.dataTransfer;
    if (!items) return;

    const files: File[] = [];
    const processEntry = async (entry: any) => {
      if (entry.isFile) {
        const file = await new Promise<File>((resolve) => entry.file(resolve));
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`Arquivo ${file.name} excede o limite de 50MB`);
          return;
        }
        files.push(file);
      } else if (entry.isDirectory) {
        const reader = entry.createReader();
        const entries = await new Promise<any[]>((resolve) => 
          reader.readEntries((entries: any[]) => resolve(entries))
        );
        for (const entry of entries) {
          await processEntry(entry);
        }
      }
    };

    for (let i = 0; i < items.length; i++) {
      const item = items[i].webkitGetAsEntry();
      if (item) {
        await processEntry(item);
      }
    }

    if (files.length > 0) {
      handleFileUpload({ target: { files } } as any);
    }
  }, []);

  const handleItemDragStart = (e: React.DragEvent, id: string, type: 'folder' | 'file') => {
    e.stopPropagation();
    setDraggedItem({ id, type });
    e.dataTransfer.setData('text/plain', ''); // Necessário para o Firefox
  };

  const handleItemDragEnd = () => {
    setDraggedItem(null);
    setDragOverFolderId(null);
  };

  const handleFolderDragEnter = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedItem && draggedItem.id !== folderId) {
      setDragOverFolderId(folderId);
    }
  };

  const handleFolderDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);
  };

  const handleFolderDrop = async (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);

    if (!draggedItem) return;

    try {
      if (draggedItem.id === targetFolderId) return;

      const table = draggedItem.type === 'folder' ? 'folders' : 'files';
      const updateField = draggedItem.type === 'folder' ? 'parent_id' : 'folder_id';

      // Verificar se a pasta de destino não é uma subpasta da pasta sendo movida
      if (draggedItem.type === 'folder') {
        let currentId = targetFolderId;
        while (currentId) {
          if (currentId === draggedItem.id) {
            toast.error('Não é possível mover uma pasta para dentro dela mesma');
            return;
          }
          const { data: folder } = await supabase
            .from('folders')
            .select('parent_id')
            .eq('id', currentId)
            .single();
          
          if (!folder) break;
          currentId = folder.parent_id;
        }
      }

      const { error } = await supabase
        .from(table)
        .update({ [updateField]: targetFolderId })
        .eq('id', draggedItem.id);

      if (error) throw error;

      toast.success('Item movido com sucesso!');
      loadCurrentFolder();
    } catch (error: any) {
      console.error('Erro ao mover item:', error);
      toast.error(`Erro ao mover item: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const loadUserInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser({ id: user.id, email: user.email || '' });
        
        const { data: userData, error } = await supabase
          .from('users')
          .select('username')
          .eq('id', user.id)
          .single();
        
        if (error) throw error;
        if (userData) {
          setUserName(userData.username);
        }
      }
    } catch (error: any) {
      console.error('Erro ao carregar informações do usuário:', error);
      toast.error('Erro ao carregar informações do usuário');
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
          const { data: folder, error: pathError } = await supabase
            .from('folders')
            .select('*')
            .eq('id', currentId)
            .single();
          
          if (pathError) throw pathError;
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
    } catch (error: any) {
      console.error('Erro ao carregar pasta:', error);
      toast.error(`Erro ao carregar conteúdo da pasta: ${error.message || 'Erro desconhecido'}`);
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
    } catch (error: any) {
      console.error('Erro ao criar pasta:', error);
      toast.error(`Erro ao criar pasta: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const calculateSpeed = (loaded: number, startTime: number): string => {
    const elapsedSeconds = (Date.now() - startTime) / 1000;
    const speedBps = loaded / elapsedSeconds;
    
    if (speedBps > 1024 * 1024) {
      return `${(speedBps / (1024 * 1024)).toFixed(2)} MB`;
    } else if (speedBps > 1024) {
      return `${(speedBps / 1024).toFixed(2)} KB`;
    }
    return `${Math.round(speedBps)} B`;
  };

  const calculateRemainingTime = (loaded: number, total: number, startTime: number): string => {
    const elapsedSeconds = (Date.now() - startTime) / 1000;
    const speedBps = loaded / elapsedSeconds;
    const remainingBytes = total - loaded;
    const remainingSeconds = remainingBytes / speedBps;
    
    if (remainingSeconds > 60) {
      return `${Math.ceil(remainingSeconds / 60)} min`;
    }
    return `${Math.ceil(remainingSeconds)} seg`;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Check file sizes before starting upload
    const oversizedFiles = Array.from(files).filter(file => file.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      toast.error(
        oversizedFiles.length === 1
          ? `O arquivo ${oversizedFiles[0].name} excede o limite de 50MB`
          : `${oversizedFiles.length} arquivos excedem o limite de 50MB`
      );
      return;
    }

    setIsUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Usuário não autenticado');
      setIsUploading(false);
      return;
    }

    const uploadSession = Date.now().toString();
    const startTime = Date.now();
    let totalUploaded = 0;
    const totalSize = Array.from(files).reduce((acc, file) => acc + file.size, 0);

    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('files')
          .upload(filePath, file, {
            onUploadProgress: (progress) => {
              totalUploaded += progress.loaded;
              const percent = Math.round((totalUploaded / totalSize) * 100);
              const speed = calculateSpeed(totalUploaded, startTime);
              const remainingTime = calculateRemainingTime(totalUploaded, totalSize, startTime);
              
              setUploadProgress({
                fileName: file.name,
                progress: percent,
                speed,
                remainingTime
              });
            }
          });

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
              owner_id: user.id,
              upload_session: uploadSession
            }
          ]);

        if (dbError) throw dbError;
      }

      toast.success('Arquivo(s) enviado(s) com sucesso!');
      loadCurrentFolder();
    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast.error(`Erro ao enviar arquivo(s): ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFolderUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Check file sizes before starting upload
    const oversizedFiles = Array.from(files).filter(file => file.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      toast.error(
        oversizedFiles.length === 1
          ? `O arquivo ${oversizedFiles[0].name} excede o limite de 50MB`
          : `${oversizedFiles.length} arquivos excedem o limite de 50MB`
      );
      return;
    }

    setIsUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Usuário não autenticado');
      setIsUploading(false);
      return;
    }

    const uploadSession = Date.now().toString();
    const startTime = Date.now();
    let totalUploaded = 0;
    const totalSize = Array.from(files).reduce((acc, file) => acc + file.size, 0);

    try {
      // Create a map to store folder paths and their IDs
      const folderMap = new Map<string, string>();
      
      // Process all files
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const relativePath = file.webkitRelativePath;
        const pathParts = relativePath.split('/');
        const fileName = pathParts.pop() || '';
        let currentPath = '';
        let parentId: string | null = currentFolder;

        // Create folders in the path if they don't exist
        for (const folderName of pathParts) {
          if (folderName === '') continue;
          
          currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;
          
          if (!folderMap.has(currentPath)) {
            const { data: folder, error: folderError } = await supabase
              .from('folders')
              .insert([
                {
                  name: folderName,
                  parent_id: parentId,
                  user_id: user.id,
                  owner_id: user.id,
                  upload_session: uploadSession
                }
              ])
              .select()
              .single();

            if (folderError) throw folderError;
            folderMap.set(currentPath, folder.id);
            parentId = folder.id;
          } else {
            parentId = folderMap.get(currentPath) || null;
          }
        }

        // Upload the file
        const fileExt = fileName.split('.').pop();
        const filePath = `${user.id}/${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('files')
          .upload(filePath, file, {
            onUploadProgress: (progress) => {
              totalUploaded += progress.loaded;
              const percent = Math.round((totalUploaded / totalSize) * 100);
              const speed = calculateSpeed(totalUploaded, startTime);
              const remainingTime = calculateRemainingTime(totalUploaded, totalSize, startTime);
              
              setUploadProgress({
                fileName: file.name,
                progress: percent,
                speed,
                remainingTime
              });
            }
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('files')
          .getPublicUrl(filePath);

        const { error: dbError } = await supabase
          .from('files')
          .insert([
            {
              name: fileName,
              size: file.size,
              type: file.type,
              url: publicUrl,
              folder_id: parentId,
              user_id: user.id,
              owner_id: user.id,
              upload_session: uploadSession
            }
          ]);

        if (dbError) throw dbError;
      }

      toast.success('Pasta(s) e arquivo(s) enviado(s) com sucesso!');
      loadCurrentFolder();
    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast.error(`Erro ao enviar pasta(s) e arquivo(s): ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
      if (folderInputRef.current) {
        folderInputRef.current.value = '';
      }
    }
  };

  const handleCancelUpload = useCallback(() => {
    setIsUploading(false);
    setUploadProgress(null);
    toast.info('Upload cancelado');
  }, []);

  const handleFileDownload = async (file: File) => {
    try {
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Download iniciado!');
    } catch (error: any) {
      console.error('Erro ao baixar arquivo:', error);
      toast.error(`Erro ao baixar arquivo: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: any) {
      console.error('Erro ao fazer logout:', error);
      toast.error(`Erro ao fazer logout: ${error.message || 'Erro desconhecido'}`);
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
    } catch (error: any) {
      console.error('Erro ao alterar privacidade:', error);
      toast.error(`Erro ao alterar privacidade do item: ${error.message || 'Erro desconhecido'}`);
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
      if (selectedItem.type === 'folder') {
        navigator.clipboard.writeText(item.name);
        toast.success('Nome da pasta copiado para a área de transferência!');
      } else {
        navigator.clipboard.writeText((item as File).url);
        toast.success('Link de download copiado para a área de transferência!');
      }
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
    } catch (error: any) {
      console.error('Erro ao renomear:', error);
      toast.error(`Erro ao renomear item: ${error.message || 'Erro desconhecido'}`);
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

  const deleteFolder = async (folderId: string): Promise<void> => {
    try {
      // First, recursively get all subfolders
      const getSubfolders = async (parentId: string): Promise<string[]> => {
        const { data: subfolders, error } = await supabase
          .from('folders')
          .select('id')
          .eq('parent_id', parentId);
        
        if (error) throw error;
        
        const folderIds = [parentId];
        for (const folder of subfolders || []) {
          folderIds.push(...await getSubfolders(folder.id));
        }
        
        return folderIds;
      };

      // Get all folder IDs to delete
      const folderIds = await getSubfolders(folderId);

      // Delete all files in these folders
      for (const id of folderIds) {
        const { error: filesError } = await supabase
          .from('files')
          .delete()
          .eq('folder_id', id);
        
        if (filesError) throw filesError;
      }

      // Delete folders from bottom up (children first)
      for (const id of folderIds.reverse()) {
        const { error: folderError } = await supabase
          .from('folders')
          .delete()
          .eq('id', id);
        
        if (folderError) throw folderError;
      }
    } catch (error: any) {
      console.error('Erro ao excluir pasta:', error);
      throw new Error(`Erro ao excluir pasta: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const confirmDelete = async () => {
    if (!selectedItem) return;

    try {
      if (selectedItem.type === 'folder') {
        await deleteFolder(selectedItem.id);
      } else {
        const { error } = await supabase
          .from('files')
          .delete()
          .eq('id', selectedItem.id);

        if (error) throw error;
      }

      toast.success('Item excluído com sucesso!');
      loadCurrentFolder();
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      toast.error(`Erro ao excluir item: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsDeleting(false);
      setSelectedItem(null);
    }
  };

  const handleItemSelect = (id: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleBulkDelete = async () => {
    try {
      const selectedFolders = folders.filter(f => selectedItems.has(f.id));
      const selectedFiles = files.filter(f =>selectedItems.has(f.id));

      // Delete folders first (this will also delete their contents)
      for (const folder of selectedFolders) {
        await deleteFolder(folder.id);
      }

      // Delete files
      if (selectedFiles.length > 0) {
        const { error } = await supabase
          .from('files')
          .delete()
          .in('id', selectedFiles.map(f => f.id));

        if (error) throw error;
      }

      toast.success('Itens excluídos com sucesso!');
      setSelectedItems(new Set());
      loadCurrentFolder();
    } catch (error: any) {
      console.error('Erro ao excluir itens:', error);
      toast.error(`Erro ao excluir itens: ${error.message || 'Erro desconhecido'}`);
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
    <div 
      className="min-h-screen bg-gray-900 relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 bg-gray-900 bg-opacity-90 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-xl shadow-xl text-center">
            <Upload className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Solte os arquivos aqui</h3>
            <p className="text-gray-400">Arraste e solte arquivos ou pastas para fazer upload</p>
          </div>
        </div>
      )}

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

      <input
        type="file"
        ref={folderInputRef}
        onChange={handleFolderUpload}
        className="hidden"
        webkitdirectory=""
        directory=""
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
              <span>Upload Arquivo</span>
            </button>
            <button 
              onClick={() => folderInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FolderUp className="w-4 h-4" />
              <span>Upload Pasta</span>
            </button>
            {selectedItems.size > 0 && (
              <button 
                onClick={handleBulkDelete}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir Selecionados ({selectedItems.size})</span>
              </button>
            )}
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
                className={`
                  ${viewMode === 'grid'
                    ? `bg-gray-800 py-3 px-2 rounded-lg border ${selectedItems.has(folder.id) ? 'border-blue-500' : dragOverFolderId === folder.id ? 'border-green-500' : 'border-gray-700'} hover:border-blue-500 cursor-pointer transition-colors h-[88px] group relative`
                    : `flex items-center space-x-3 bg-gray-800 p-2 rounded-lg border ${selectedItems.has(folder.id) ? 'border-blue-500' : dragOverFolderId === folder.id ? 'border-green-500' : 'border-gray-700'} hover:border-blue-500 cursor-pointer transition-colors group relative`
                  }
                `}
                onContextMenu={(e) => {
                  e.preventDefault();
                  handleItemSelect(folder.id);
                }}
                draggable
                onDragStart={(e) => handleItemDragStart(e, folder.id, 'folder')}
                onDragEnd={handleItemDragEnd}
                onDragEnter={(e) => handleFolderDragEnter(e, folder.id)}
                onDragLeave={handleFolderDragLeave}
                onDrop={(e) => handleFolderDrop(e, folder.id)}
              >
                <div 
                  onClick={() => setCurrentFolder(folder.id)}
                  className={viewMode === 'grid' ? 'flex flex-col items-center justify-center h-full' : 'flex items-center space-x-3 flex-1'}
                >
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
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleItemSelect(folder.id);
                  }}
                  className={`absolute top-1 left-1 p-1 rounded-lg bg-gray-700 ${selectedItems.has(folder.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
                >
                  {selectedItems.has(folder.id) ? (
                    <CheckSquare className="w-4 h-4 text-blue-500" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-300" />
                  )}
                </button>
              </div>
            ))}
            
            {files.map(file => (
              <div
                key={file.id}
                className={`
                  ${viewMode === 'grid'
                    ? `bg-gray-800 py-3 px-2 rounded-lg border ${selectedItems.has(file.id) ? 'border-blue-500' : 'border-gray-700'} hover:border-blue-500 cursor-pointer transition-colors h-[88px] group relative`
                    : `flex items-center space-x-3 bg-gray-800 p-2 rounded-lg border ${selectedItems.has(file.id) ? 'border-blue-500' : 'border-gray-700'} hover:border-blue-500 cursor-pointer transition-colors group relative`
                  }
                `}
                onContextMenu={(e) => {
                  e.preventDefault();
                  handleItemSelect(file.id);
                }}
                draggable
                onDragStart={(e) => handleItemDragStart(e, file.id, 'file')}
                onDragEnd={handleItemDragEnd}
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
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleItemSelect(file.id);
                  }}
                  className={`absolute top-1 left-1 p-1 rounded-lg bg-gray-700 ${selectedItems.has(file.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
                >
                  {selectedItems.has(file.id) ? (
                    <CheckSquare className="w-4 h-4 text-blue-500" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-300" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Menu de Contexto */}
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
              {selectedItem?.type === 'folder' ? (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar nome</span>
                </>
              ) : (
                <>
                  <Link className="w-4 h-4" />
                  <span>Copiar link</span>
                </>
              )}
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

        {/* Upload Progress Modal */}
        {uploadProgress && (
          <UploadModal
            isOpen={true}
            progress={uploadProgress.progress}
            fileName={uploadProgress.fileName}
            onCancel={handleCancelUpload}
            speed={uploadProgress.speed}
            remainingTime={uploadProgress.remainingTime}
          />
        )}
      </main>
    </div>
  );
};

export default Dashboard;