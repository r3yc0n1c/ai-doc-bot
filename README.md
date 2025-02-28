## AI Doc Assitance app for Rocket.Chat
> *POC for [💡 Perfect AI Docs Assistant App](https://github.com/RocketChat/google-summer-of-code/blob/main/google-summer-of-code-2025.md#-perfect-ai-docs-assistant-app) @ [GSoC 2025, Rocket.Chat](https://github.com/RocketChat/google-summer-of-code/blob/main/google-summer-of-code-2025.md)*

## Installation
```sh
git clone https://github.com/r3yc0n1c/ai-doc-bot.git
cd ai-doc-bot/
yarn
```

DB Setup
```sh
# Install
yarn add chromadb chromadb-default-embed 

# Run the Chroma backend
sudo docker pull chromadb/chroma
sudo docker run -p 8000:8000 chromadb/chroma
```


## Run
```sh
yarn dev
```

### Refs:
- https://developer.rocket.chat/v1/docs/develop-a-rocketchat-sdk-bot
- https://developer.rocket.chat/v1/docs/creating-your-own-bot-from-scratch
- https://developer.rocket.chat/v1/docs/bots-development-environment-setup
