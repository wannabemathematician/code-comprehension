import { useCallback, useMemo, useState } from 'react';
import { ResizableSplit } from '../ResizableSplit/ResizableSplit';
import type {
  VirtualDirectory,
  VirtualFile,
  VirtualNode
} from '../../mocks/virtualRepo';
import { highlightCode } from '../../utils/syntaxHighlight';

const TREE_INITIAL_PERCENT = 28;
const MIN_TREE_PERCENT = 20;
const MAX_TREE_PERCENT = 60;


type Props = {
  root: VirtualDirectory;
};

function findFirstFile(dir: VirtualDirectory): VirtualFile | null {
  for (const child of dir.children) {
    if (child.type === 'file') return child;
    const nested = findFirstFile(child);
    if (nested) return nested;
  }
  return null;
}

type TreeItemProps = {
  node: VirtualNode;
  depth: number;
  selectedPath: string | null;
  collapsed: Set<string>;
  onToggleDir: (path: string) => void;
  onSelectFile: (file: VirtualFile) => void;
};

function TreeItem({
  node,
  depth,
  selectedPath,
  collapsed,
  onToggleDir,
  onSelectFile
}: TreeItemProps) {
  const isDir = node.type === 'dir';
  const isFile = node.type === 'file';
  const isSelected = isFile && selectedPath === node.path;
  const isCollapsed = isDir && collapsed.has(node.path);

  if (node.type === 'dir') {
    return (
      <>
        <li className="flex">
          <button
            type="button"
            onClick={() => onToggleDir(node.path)}
            className="flex w-full items-center rounded px-2 py-0.5 text-left text-slate-400 transition-colors hover:bg-slate-800/70 hover:text-slate-200"
            style={{ paddingLeft: 8 + depth * 12 }}
          >
            <span className="mr-1.5 w-3 text-[10px] text-slate-500">
              {isCollapsed ? '▸' : '▾'}
            </span>
            <span>{node.name}/</span>
          </button>
        </li>
        {!isCollapsed &&
          node.children.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              collapsed={collapsed}
              onToggleDir={onToggleDir}
              onSelectFile={onSelectFile}
            />
          ))}
      </>
    );
  }

  return (
    <li className="flex">
      <button
        type="button"
        onClick={() => onSelectFile(node)}
        className={[
          'flex w-full items-center rounded px-2 py-0.5 text-left transition-colors',
          'hover:bg-slate-800/70',
          isSelected ? 'bg-slate-800 text-sky-300' : 'text-slate-300'
        ].join(' ')}
        style={{ paddingLeft: 8 + depth * 12 }}
      >
        <span className="mr-1.5 w-3 text-[10px] text-slate-500">•</span>
        <span>{node.name}</span>
      </button>
    </li>
  );
}

export function RepositoryExplorer({ root }: Props) {
  const initialFile = useMemo(() => findFirstFile(root), [root]);
  const [selectedFile, setSelectedFile] = useState<VirtualFile | undefined>(
    initialFile ?? undefined
  );
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [treePercent, setTreePercent] = useState(TREE_INITIAL_PERCENT);

  const onToggleDir = useCallback((path: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const treePanel = (
    <nav className="flex h-full min-h-0 flex-col overflow-hidden border-slate-800 bg-slate-950/70 font-mono text-[10px] text-slate-300">
      <div className="flex h-8 shrink-0 items-center gap-3 border-b border-slate-800 bg-slate-950/90 px-3 text-[10px] text-slate-300">
        <button className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] font-medium">
          Files
        </button>
        <button className="rounded px-2 py-0.5 text-[10px] text-slate-500">
          Search (coming soon)
        </button>
      </div>
      <ul className="min-h-0 space-y-0.5 overflow-y-auto px-2 py-2 pb-2">
        {root.children.map((child) => (
          <TreeItem
            key={child.path}
            node={child}
            depth={0}
            selectedPath={selectedFile?.path ?? null}
            collapsed={collapsed}
            onToggleDir={onToggleDir}
            onSelectFile={setSelectedFile}
          />
        ))}
      </ul>
    </nav>
  );

  const codePanel = (
    <section className="flex h-full min-h-0 min-w-0 flex-col bg-slate-950/80">
      <header className="flex shrink-0 items-center justify-between border-b border-slate-800 px-3 py-2">
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-mono text-[11px] text-slate-200">
            {selectedFile?.path ?? 'Select a file'}
          </span>
          <span className="text-[10px] text-slate-500">
            Read-only • drag divider to resize
          </span>
        </div>
      </header>
      <div className="min-h-[360px] flex-1 overflow-y-auto">
        {selectedFile ? (
          selectedFile.contents.length === 0 ? (
            <div className="flex min-h-[200px] items-center justify-center p-4 text-[11px] text-slate-500">
              Empty file
            </div>
          ) : (
            <div className="flex font-mono text-[11px] leading-relaxed">
              <div className="shrink-0 select-none border-r border-slate-800 bg-slate-900/50 px-3 py-3 text-right text-slate-500">
                {selectedFile.contents.split('\n').map((_, i) => (
                  <div key={i} className="leading-relaxed">
                    {i + 1}
                  </div>
                ))}
              </div>
              <pre className="m-0 min-h-full flex-1 bg-transparent p-3 text-slate-100 whitespace-pre">
                <code
                  className={`language-${selectedFile.language}`}
                  dangerouslySetInnerHTML={{
                    __html: highlightCode(selectedFile.contents, selectedFile.language)
                  }}
                />
              </pre>
            </div>
          )
        ) : (
          <div className="flex h-full min-h-[200px] items-center justify-center text-[11px] text-slate-400">
            Choose a file from the tree to start reading the code.
          </div>
        )}
      </div>
    </section>
  );

  return (
    <div className="flex h-full min-h-0 flex-col text-[11px] text-slate-200">
      <ResizableSplit
        leftPercent={treePercent}
        onResize={setTreePercent}
        minLeftPercent={MIN_TREE_PERCENT}
        maxLeftPercent={MAX_TREE_PERCENT}
        left={treePanel}
        right={codePanel}
      />
    </div>
  );
}

