import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Settings, Key } from 'lucide-react'
import { Button } from '@/components/Button'
import { ScrollArea } from '@/components/ScrollArea'
import toast from 'react-hot-toast'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { TESTABLE_LLM_PROVIDERS } from '@/shared/data/constants/llm-providers'
import {
  settingsApi,
  type McpApiKey,
  type ProviderStatus,
  type ProviderTestResult,
} from '@/domains/2d-canvas/core/io/settings.api'
import {
  SETTINGS_CLOSE_LABEL,
  SETTINGS_COPIED_TOAST,
  SETTINGS_LOAD_MCP_KEYS_FAILED_LOG,
  SETTINGS_LOAD_PROVIDERS_FAILED_LOG,
  SETTINGS_MCP_CREATE_KEY_FAILED_TOAST,
  SETTINGS_MCP_KEY_CREATED_TOAST,
  SETTINGS_MCP_KEY_NAME_REQUIRED,
  SETTINGS_MCP_KEY_REVOKED_TOAST,
  SETTINGS_MCP_REVOKE_KEY_FAILED,
  SETTINGS_TEST_REQUEST_FAILED,
  SettingsDialogTab,
} from '@/domains/2d-canvas/constants/settings-dialog'
import { SettingsDialogGeneralTab } from './SettingsDialogGeneralTab'
import { SettingsDialogMcpKeysTab } from './SettingsDialogMcpKeysTab'

interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
  projectId?: string
}

type Tab = SettingsDialogTab

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ isOpen, onClose }) => {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const [activeTab, setActiveTab] = useState<Tab>(SettingsDialogTab.General)
  const [providers, setProviders] = useState<ProviderStatus | null>(null)
  const [loadingProviders, setLoadingProviders] = useState(false)
  const [providerTests, setProviderTests] = useState<Record<string, ProviderTestResult>>({})
  const [testingProvider, setTestingProvider] = useState<string | null>(null)
  const [mcpKeys, setMcpKeys] = useState<McpApiKey[]>([])
  const [isLoadingMcpKeys, setIsLoadingMcpKeys] = useState(false)
  const [newMcpKeyName, setNewMcpKeyName] = useState('')
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null)
  const [isCreatingKey, setIsCreatingKey] = useState(false)

  const runProviderTest = async (providerKey: string): Promise<void> => {
    setTestingProvider(providerKey)
    try {
      const data = await settingsApi.probeProvider(providerKey)
      setProviderTests(prev => ({ ...prev, [providerKey]: data }))
    } catch (error) {
      setProviderTests(prev => ({
        ...prev,
        [providerKey]: { ok: false, error: getErrorMessage(error) || SETTINGS_TEST_REQUEST_FAILED },
      }))
    } finally {
      setTestingProvider(null)
    }
  }

  const runAllProviderTests = async (): Promise<void> => {
    if (!providers) return
    for (const { key } of TESTABLE_LLM_PROVIDERS) {
      if (providers[key]) {
        await runProviderTest(key)
      }
    }
  }

  useEffect(() => {
    if (!isOpen) return

    setLoadingProviders(true)
    settingsApi
      .fetchProviders()
      .then(setProviders)
      .catch(err => console.error(SETTINGS_LOAD_PROVIDERS_FAILED_LOG, err))
      .finally(() => setLoadingProviders(false))

    setIsLoadingMcpKeys(true)
    settingsApi
      .fetchMcpKeys()
      .then(setMcpKeys)
      .catch(err => console.error(SETTINGS_LOAD_MCP_KEYS_FAILED_LOG, err))
      .finally(() => setIsLoadingMcpKeys(false))
  }, [isOpen])

  const handleCreateMcpKey = async () => {
    if (!newMcpKeyName.trim()) {
      toast.error(SETTINGS_MCP_KEY_NAME_REQUIRED)
      return
    }
    setIsCreatingKey(true)
    setNewlyCreatedKey(null)
    try {
      const { plainKey, apiKey } = await settingsApi.createMcpKey(newMcpKeyName.trim())
      setNewlyCreatedKey(plainKey)
      setMcpKeys(prev => [apiKey, ...prev])
      setNewMcpKeyName('')
      toast.success(SETTINGS_MCP_KEY_CREATED_TOAST)
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || SETTINGS_MCP_CREATE_KEY_FAILED_TOAST)
    } finally {
      setIsCreatingKey(false)
    }
  }

  const handleRevokeMcpKey = async (keyId: string) => {
    try {
      await settingsApi.revokeMcpKey(keyId)
      setMcpKeys(prev => prev.filter(k => k.id !== keyId))
      toast.success(SETTINGS_MCP_KEY_REVOKED_TOAST)
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) || SETTINGS_MCP_REVOKE_KEY_FAILED)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success(SETTINGS_COPIED_TOAST)
  }

  if (!isOpen || !mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-4xl h-[600px] bg-zinc-950 border border-zinc-900 rounded-lg shadow-lg flex overflow-hidden relative text-zinc-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-[200px] bg-zinc-900/30 border-r border-zinc-900 flex flex-col p-4">
          <h2 className="text-lg font-bold mb-6 px-2">Settings</h2>
          <nav className="space-y-2 flex-1">
            <Button
              variant={activeTab === SettingsDialogTab.General ? 'secondary' : 'ghost'}
              className="w-full justify-start gap-2"
              onClick={() => setActiveTab(SettingsDialogTab.General)}
            >
              <Settings className="w-4 h-4" />
              General
            </Button>
            <Button
              variant={activeTab === SettingsDialogTab.McpKeys ? 'secondary' : 'ghost'}
              className="w-full justify-start gap-2"
              onClick={() => setActiveTab(SettingsDialogTab.McpKeys)}
            >
              <Key className="w-4 h-4" />
              MCP Keys
            </Button>
          </nav>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <ScrollArea className="flex-1 p-6">
            <div className="max-w-2xl mx-auto space-y-8 pb-20">
              {activeTab === SettingsDialogTab.General && (
                <SettingsDialogGeneralTab
                  providers={providers}
                  loadingProviders={loadingProviders}
                  providerTests={providerTests}
                  testingProvider={testingProvider}
                  onRunProviderTest={runProviderTest}
                  onRunAllProviderTests={runAllProviderTests}
                />
              )}

              {activeTab === SettingsDialogTab.McpKeys && (
                <SettingsDialogMcpKeysTab
                  mcpKeys={mcpKeys}
                  isLoadingMcpKeys={isLoadingMcpKeys}
                  newMcpKeyName={newMcpKeyName}
                  newlyCreatedKey={newlyCreatedKey}
                  isCreatingKey={isCreatingKey}
                  onNewMcpKeyNameChange={setNewMcpKeyName}
                  onCreateMcpKey={() => void handleCreateMcpKey()}
                  onRevokeMcpKey={keyId => void handleRevokeMcpKey(keyId)}
                  onCopyToClipboard={copyToClipboard}
                />
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t border-border bg-card flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              {SETTINGS_CLOSE_LABEL}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
