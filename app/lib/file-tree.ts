import type { FileInfo } from '~/lib/api';

export interface FileTreeLeafNode {
  kind: 'file';
  name: string;
  file: FileInfo;
}

export interface FileTreeDirectoryNode {
  kind: 'directory';
  name: string;
  children: FileTreeNode[];
}

export type FileTreeNode = FileTreeLeafNode | FileTreeDirectoryNode;

interface MutableDirectoryNode {
  name: string;
  directories: Map<string, MutableDirectoryNode>;
  files: FileTreeLeafNode[];
}

function createMutableDirectory(name: string): MutableDirectoryNode {
  return {
    name,
    directories: new Map<string, MutableDirectoryNode>(),
    files: [],
  };
}

function toFileTreeNodes(directory: MutableDirectoryNode): FileTreeNode[] {
  const childDirectories = Array.from(directory.directories.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((childDirectory) => ({
      kind: 'directory' as const,
      name: childDirectory.name,
      children: toFileTreeNodes(childDirectory),
    }));

  const childFiles = [...directory.files].sort((a, b) => a.name.localeCompare(b.name));

  return [...childDirectories, ...childFiles];
}

export function buildFileTree(files: FileInfo[]): FileTreeNode[] {
  const root = createMutableDirectory('');

  for (const file of files) {
    const segments = file.relativePath.split('/').filter(Boolean);
    if (segments.length === 0) continue;

    let currentDirectory = root;

    for (const segment of segments.slice(0, -1)) {
      let nextDirectory = currentDirectory.directories.get(segment);
      if (!nextDirectory) {
        nextDirectory = createMutableDirectory(segment);
        currentDirectory.directories.set(segment, nextDirectory);
      }
      currentDirectory = nextDirectory;
    }

    const filename = segments[segments.length - 1] || file.relativePath;
    currentDirectory.files.push({
      kind: 'file',
      name: filename,
      file,
    });
  }

  return toFileTreeNodes(root);
}
