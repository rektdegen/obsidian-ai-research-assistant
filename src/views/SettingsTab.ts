import { type App, PluginSettingTab, Setting } from 'obsidian'

import OpenAIModels from '../services/openai/models'

import obfuscateApiKey from '../utils/obfuscateApiKey'

import {
  BOT_PREFIX,
  DEFAULT_MAX_MEMORY_COUNT,
  PLUGIN_NAME,
  PLUGIN_PREFIX,
  USER_PREFIX,
} from '../constants'
import { OPEN_AI_API_KEY_URL } from '../services/openai/constants'

import type ObsidianAIResearchAssistant from '../main'
import type { OpenAIModel } from '../services/openai/types'
import AssistantPreamble from 'src/preambles/assistant'

export default class SettingsTab extends PluginSettingTab {
  plugin: ObsidianAIResearchAssistant

  constructor(app: App, plugin: ObsidianAIResearchAssistant) {
    super(app, plugin)

    this.plugin = plugin
  }

  async resetPluginView(): Promise<void> {
    this.plugin.app.workspace.detachLeavesOfType(PLUGIN_PREFIX)

    await this.plugin.initializeChatService()
  }

  display(): void {
    const { containerEl } = this

    containerEl.empty()

    containerEl.createEl('h2', { text: `${PLUGIN_NAME} Settings` })

    const settingsDescContainer = containerEl.createEl('div')

    settingsDescContainer.createEl('p', {
      text: `${PLUGIN_NAME} is a plugin that facilitates Researchers and Prompt Engineers studying how conversational AIs respond to various prompts. We currently only support OpenAI's GPT-3 API with the following models: text-davinci-003`,
    })

    const helpText = settingsDescContainer.createEl('p', {
      text: 'You can get your API Key here: ',
    })

    helpText.createEl('a', {
      text: OPEN_AI_API_KEY_URL,
      href: OPEN_AI_API_KEY_URL,
    })

    new Setting(containerEl)
      .setName('DEBUG MODE')
      .setDesc(`(Coming Soon) Display extra debugging info in the UI and Developer Console.`)
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.debugMode)

        toggle.setDisabled(true)

        toggle.onChange(async (value) => {
          this.plugin.settings.debugMode = value
          await this.plugin.saveSettings()
        })
      })

    new Setting(containerEl)
      .setName('OpenAI API Key')
      .setDesc(
        'Your API Key will be used to make requests when you submit a message in the Chat Window. Changing this value will reset any existing chat windows.'
      )
      .addText((text) =>
        text
          .setPlaceholder(
            this.plugin.settings.apiKeySaved
              ? `${obfuscateApiKey(this.plugin.settings.openApiKey)}`
              : 'Set your API key'
          )
          .onChange(async (value) => {
            this.plugin.settings.openApiKey = value
            this.plugin.settings.apiKeySaved = true

            await this.plugin.saveSettings()

            await this.resetPluginView()
          })
      )

    new Setting(containerEl)
      .setName('Maximum Tokens')
      .setDesc(
        'What is the maximum amount of tokens you want to use for your request? This includes any Context like a Preamble and Memories as well as User and Bot Prefixes and Start and Stop sequences and determines how many tokens the API will use to respond to you. Changing this value will reset any existing chat windows.'
      )
      .addText((text) =>
        text
          .setPlaceholder(`${this.plugin.settings.defaultMaxTokens ?? 0}`)
          .onChange(async (value) => {
            const number = Number(value)

            this.plugin.settings.defaultMaxTokens = !Number.isNaN(number) ? Number(value) : 0

            await this.plugin.saveSettings()

            await this.resetPluginView()
          })
      )

    new Setting(containerEl)
      .setName('Token Buffer')
      .setDesc(
        '(Coming Soon) How many tokens would you like to reserve for the AI to respond to your prompt? Changing this value will reset any existing chat windows.'
      )
      .addText((text) =>
        text
          .setDisabled(true)
          .setPlaceholder(`${this.plugin.settings.defaultTokenBuffer ?? 0}`)
          .onChange(async (value) => {
            const number = Number(value)
            this.plugin.settings.defaultTokenBuffer = !Number.isNaN(number) ? Number(value) : 0

            await this.plugin.saveSettings()

            await this.resetPluginView()
          })
      )

    new Setting(containerEl)
      .setName('Enable Memories')
      .setDesc(
        'Enable or disable the ability to store messages in memory. Changing this value will reset any existing chat windows.'
      )
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.enableMemory)

        toggle.onChange(async (value) => {
          this.plugin.settings.enableMemory = value

          await this.plugin.saveSettings()

          await this.resetPluginView()

          this.display()
        })
      })

    new Setting(containerEl)
      .setName('Enable Memory Manager')
      .setDesc(
        '(EXPERIMENTAL) Enable or disable the ability to change which messages are used as memories when adding context to the given prompt. Core memories will always be included. Remembered messages will be included if there is more room for memories. Forgotten messages will never be included. By default, the most recent messages up to the Maximum Memory Count are included. Changing this value will reset any existing chat windows.'
      )
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.enableMemoryManager)

        toggle.onChange(async (value) => {
          this.plugin.settings.enableMemoryManager = value

          await this.plugin.saveSettings()

          await this.resetPluginView()

          this.display()
        })
      })

    if (this.plugin.settings.enableMemory) {
      new Setting(containerEl)
        .setName('Maximum Memory Count')
        .setDesc(
          `The number of messages that should be stored in conversation memory. Set to 0 for no limit.${
            this.plugin.settings.enableMemoryManager
              ? ' Note: Core Memories will always be included when the Experimental Memory Manager is enabled, but if there are more Core Memories than this limit, no other memories will be included.'
              : ''
          }`
        )
        .addSlider((slider) => {
          slider
            .setDynamicTooltip()
            .setLimits(0, 20, 1)
            .setValue(this.plugin.settings.maxMemoryCount ?? DEFAULT_MAX_MEMORY_COUNT)
            .onChange(async (value) => {
              this.plugin.settings.maxMemoryCount = value

              await this.plugin.saveSettings()

              await this.resetPluginView()
            })
        })
    }

    new Setting(containerEl)
      .setName('Default Model')
      .setDesc(
        `(Coming Soon) The default model to use when sending a message. Changing this value will reset any existing chat windows.`
      )
      .addDropdown((dropdown) => {
        Object.keys(OpenAIModels).forEach((model) => {
          dropdown.addOption(model, model)
        })

        dropdown.setDisabled(true)

        dropdown.setValue(this.plugin.settings.defaultModel)

        dropdown.onChange(async (value) => {
          this.plugin.settings.defaultModel = value as OpenAIModel

          await this.plugin.saveSettings()

          await this.resetPluginView()
        })
      })

    new Setting(containerEl)
      .setName('Default Preamble')
      .setDesc(
        `The default preamble to use when starting a Conversation. You can edit the Preamble in the Chat interface. Changing this value will reset any existing chat windows.`
      )
      .setClass('ai-research-assistant__settings__preamble')
      .addTextArea((text) =>
        text
          .setPlaceholder(AssistantPreamble())
          .setValue(this.plugin.settings.defaultPreamble ?? '')
          .onChange(async (value) => {
            this.plugin.settings.defaultPreamble = value

            await this.plugin.saveSettings()

            await this.resetPluginView()
          })
      )

    // create Setting text input for user prefix
    new Setting(containerEl)
      .setName('Default User Prefix')
      .setDesc(
        'The prefix to use when displaying a user message. Changing this value will reset any existing chat windows.'
      )
      .addText((text) =>
        text
          .setPlaceholder(USER_PREFIX)
          .setValue(this.plugin.settings.userPrefix)
          .onChange(async (value) => {
            this.plugin.settings.userPrefix = value

            await this.plugin.saveSettings()

            await this.resetPluginView()
          })
      )

    // create Setting text input for bot prefix
    new Setting(containerEl)
      .setName('Default Bot Prefix')
      .setDesc(
        'The prefix to use when displaying a bot message. Changing this value will reset any existing chat windows.'
      )
      .addText((text) =>
        text
          .setPlaceholder(BOT_PREFIX)
          .setValue(this.plugin.settings.botPrefix)
          .onChange(async (value) => {
            this.plugin.settings.botPrefix = value

            await this.plugin.saveSettings()

            await this.resetPluginView()
          })
      )

    new Setting(containerEl)
      .setName('Conversation Directory')
      .setDesc('Where to save conversations.')
      .addText((text) =>
        text.setValue(this.plugin.settings.conversationHistoryDirectory).onChange(async (value) => {
          this.plugin.settings.conversationHistoryDirectory = value

          await this.plugin.saveSettings()
        })
      )

    new Setting(containerEl)
      .setName('Autosave Conversations')
      .setDesc(
        `Automatically save conversations to your Vault. You will need to close any open the Chat windows for this change to take effect.`
      )
      .addToggle((toggle) => {
        toggle.setValue(this.plugin.settings.autosaveConversationHistory)

        toggle.onChange(async (value) => {
          this.plugin.settings.autosaveConversationHistory = value

          await this.plugin.saveSettings()

          this.display()
        })
      })

    if (this.plugin.settings.autosaveConversationHistory) {
      new Setting(containerEl)
        .setName('Autosave Interval')
        .setDesc(
          `How many seconds should pass before a conversation is automatically saved to your Vault. You will need to close any open the Chat windows for this change to take effect.`
        )
        .addText((text) => {
          text.setValue(`${this.plugin.settings.autosaveInterval}`)

          text.onChange(async (value) => {
            const number = Number(value)
            this.plugin.settings.autosaveInterval = !Number.isNaN(value) ? number : 15

            await this.plugin.saveSettings()
          })
        })
    }
  }
}
