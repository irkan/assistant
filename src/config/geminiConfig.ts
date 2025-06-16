import { FunctionDeclaration, Modality, MediaResolution, Type } from '@google/genai';
import { systemInstructionText } from './systemInstruction';

export const MODEL_NAME = 'gemini-2.5-flash-preview-native-audio-dialog';

export const greetingFunctionDeclaration: FunctionDeclaration = {
  name: "greeting",
  description: "Greeting qrafikini JSON formatda göstər .",
  parameters: {
    type: Type.OBJECT,
    properties: {
      json_graph: {
        type: Type.STRING,
        description:
          "JSON STRING representation of the graph to render. Must be a string, not a json object",
      },
    },
    required: ["json_graph"],
  },
};

export const altairFunctionDeclaration: FunctionDeclaration = {
  name: "altair",
  description: "Altair qrafikini JSON formatda göstər .",
  parameters: {
    type: Type.OBJECT,
    properties: {
      json_graph: {
        type: Type.STRING,
        description:
          "JSON STRING representation of the graph to render. Must be a string, not a json object",
      },
    },
    required: ["json_graph"],
  },
};

export const geminiSessionConfig = {
  responseModalities: [Modality.AUDIO],
  mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,
  speechConfig: {
    language_code: 'az-AZ', // Azerbaijani language
    voiceConfig: {
      prebuiltVoiceConfig: {
        voiceName: 'Aoede',
      }
    }
  },
  outputAudioTranscription: {
    enable: true
  },
  contextWindowCompression: {
    triggerTokens: '25600',
    slidingWindow: { targetTokens: '12800' },
  },
  systemInstruction: {
    text: systemInstructionText,
  },
  tools: [
    { googleSearch: {} },
    { functionDeclarations: [greetingFunctionDeclaration, altairFunctionDeclaration] },
  ],
}; 