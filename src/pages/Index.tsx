import { useState } from "react";
import { useSpreadsheet } from "@/lib/useSpreadsheet";
import FileLoadScreen from "@/components/FileLoadScreen";
import MainWorkspace from "@/components/MainWorkspace";

interface IndexProps {
  userId:   string;
  username: string;
  onLogout: () => void;
}

const Index = ({ userId, username, onLogout }: IndexProps) => {
  const {
    phase,
    files,
    activeFile,
    activeFileId,
    pipelineResult,
    loadFile,
    switchFile,
    removeSourceFile,
    submitCommand,
    confirmOperation,
    cancelOperation,
    removeFromStack,
    undo,
    stylePromptSession,
    resolveStylePrompt,
    onCancelStylePrompt,
    computeResult,
    chatMessages,
    addPipelineOperations,
    newColumnPrompt,
    resolveNewColumn,
    onCancelNewColumn,
  } = useSpreadsheet();

  const [showAddFile, setShowAddFile] = useState(false);

  if (phase === "load" || showAddFile) {
    return (
      <FileLoadScreen
        onLoad={(name, data, columns, styles, titleRows, sourceFileId, fileName) => {
          loadFile(name, data, columns, styles, titleRows, sourceFileId, fileName);
          setShowAddFile(false);
        }}
        hasFiles={files.length > 0}
        onBack={files.length > 0 ? () => setShowAddFile(false) : undefined}
      />
    );
  }

  if (!activeFile) return null;

  return (
    <MainWorkspace
      files={files}
      activeFile={activeFile}
      activeFileId={activeFileId}
      pipelineResult={pipelineResult}
      onSwitchFile={switchFile}
      onRemoveFile={removeSourceFile}
      onAddFile={() => setShowAddFile(true)}
      onSubmit={submitCommand}
      onConfirm={confirmOperation}
      onCancel={cancelOperation}
      onUndo={undo}
      onRemoveFromStack={removeFromStack}
      onLoadOpsIntoPending={addPipelineOperations}
      stylePromptSession={stylePromptSession}
      onResolveStylePrompt={resolveStylePrompt}
      onCancelStylePrompt={onCancelStylePrompt}
      computeResult={computeResult}
      chatMessages={chatMessages}
      userId={userId}
      username={username}
      onLogout={onLogout}
      newColumnPrompt={newColumnPrompt}
      onResolveNewColumn={resolveNewColumn}
      onCancelNewColumn={onCancelNewColumn}
    />
  );
};

export default Index;
