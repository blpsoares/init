// ─────────────────────────────────────────────────────────
//  Package Definitions
//  Each entry describes a tool that can be installed.
// ─────────────────────────────────────────────────────────

export interface Package {
  /** Display name */
  name: string;
  /** Short description shown in the selection menu */
  description: string;
  /** Category used to group packages in interactive mode */
  category: string;
  /** Pre-selected by default in interactive mode */
  essential?: boolean;
  /** Developer profiles this package belongs to */
  profiles?: Array<'backend' | 'frontend' | 'devops' | 'data'>;
  /** Shell command to check if the tool is already installed (exit 0 = installed) */
  checkCommand?: string;
  /** Installation command executed via `bash -c` */
  command: string;
  /** Message to display after a successful install */
  postInstall?: string;
  /** Whether the shell needs to be reloaded after installation */
  requiresReload?: boolean;
  /** Package names that must be installed before this one */
  dependencies?: string[];
}

// ── Shell ─────────────────────────────────────────────────

const zsh: Package = {
  name: 'Zsh',
  description: 'Feature-rich shell with better completion & plugins',
  category: 'Shell',
  essential: true,
  profiles: ['backend', 'frontend', 'devops', 'data'],
  checkCommand: 'which zsh',
  command: 'sudo apt-get install -y zsh',
  postInstall: 'To make Zsh your default shell run: chsh -s $(which zsh)',
};

const ohMyZsh: Package = {
  name: 'Oh My Zsh',
  description: 'Framework for managing Zsh configuration',
  category: 'Shell',
  profiles: ['backend', 'frontend', 'devops', 'data'],
  checkCommand: '[ -d "$HOME/.oh-my-zsh" ]',
  command: 'sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended',
  requiresReload: true,
};

const starship: Package = {
  name: 'Starship',
  description: 'Cross-shell minimal, blazing-fast prompt',
  category: 'Shell',
  essential: true,
  profiles: ['backend', 'frontend', 'devops', 'data'],
  checkCommand: 'which starship',
  // --yes disables the interactive confirmation prompt
  command: 'curl -sS https://starship.rs/install.sh | sh -s -- --yes',
  postInstall: 'Add to ~/.bashrc: eval "$(starship init bash)" | or ~/.zshrc: eval "$(starship init zsh)"',
  requiresReload: true,
};

// ── Development Tools ─────────────────────────────────────

const buildEssentials: Package = {
  name: 'Build Essentials',
  description: 'GCC, Make, git, curl, wget and core build tools',
  category: 'Development',
  essential: true,
  profiles: ['backend', 'frontend', 'devops', 'data'],
  checkCommand: 'which gcc && which make',
  command: 'sudo apt-get update && sudo apt-get install -y build-essential git curl wget unzip',
};

const python3: Package = {
  name: 'Python 3 & pip',
  description: 'Python runtime with pip and virtual environment support',
  category: 'Development',
  profiles: ['backend', 'data'],
  checkCommand: 'which python3 && which pip3',
  command: 'sudo apt-get update && sudo apt-get install -y python3 python3-pip python3-venv python3-dev',
};

const pyenv: Package = {
  name: 'pyenv',
  description: 'Python version manager — install and switch any Python version',
  category: 'Development',
  profiles: ['backend', 'data'],
  checkCommand: 'which pyenv || [ -d "$HOME/.pyenv" ]',
  command: [
    'sudo apt-get update',
    'sudo apt-get install -y make build-essential libssl-dev zlib1g-dev libbz2-dev libreadline-dev libsqlite3-dev wget curl llvm libncurses5-dev libncursesw5-dev xz-utils tk-dev libffi-dev liblzma-dev git',
    'curl https://pyenv.run | bash',
  ].join(' && \\\n'),
  postInstall: 'Add to ~/.bashrc: export PYENV_ROOT="$HOME/.pyenv" && export PATH="$PYENV_ROOT/bin:$PATH" && eval "$(pyenv init -)"  then run: pyenv install 3.12',
  requiresReload: true,
};

const golang: Package = {
  name: 'Go',
  description: 'Go programming language (latest stable, from golang.org)',
  category: 'Development',
  profiles: ['backend', 'devops'],
  checkCommand: 'which go',
  command: [
    'GO_VERSION=$(curl -fsSL "https://go.dev/VERSION?m=text" | head -1)',
    'curl -fsSL "https://dl.google.com/go/${GO_VERSION}.linux-amd64.tar.gz" -o /tmp/go.tar.gz',
    'sudo rm -rf /usr/local/go',
    'sudo tar -C /usr/local -xzf /tmp/go.tar.gz',
    'rm /tmp/go.tar.gz',
  ].join(' && \\\n'),
  postInstall: 'Add to ~/.bashrc: export PATH=$PATH:/usr/local/go/bin:$HOME/go/bin',
  requiresReload: true,
};

// ── JavaScript / Node.js ──────────────────────────────────

const volta: Package = {
  name: 'Volta',
  description: 'JavaScript toolchain manager (Node, npm, Yarn)',
  category: 'JavaScript',
  profiles: ['backend', 'frontend'],
  checkCommand: 'which volta || [ -f "$HOME/.volta/bin/volta" ]',
  command: 'curl -fsSL https://get.volta.sh | bash',
  postInstall: 'Restart your shell, then run: volta install node',
  requiresReload: true,
};

const nodejs: Package = {
  name: 'Node.js LTS',
  description: 'JavaScript runtime — installed via Volta',
  category: 'JavaScript',
  profiles: ['backend', 'frontend'],
  // Requires Volta; uses its full path so PATH update is not needed
  checkCommand: 'which node',
  command: 'export VOLTA_HOME="$HOME/.volta" && export PATH="$VOLTA_HOME/bin:$PATH" && volta install node@lts',
  requiresReload: true,
};

const bun: Package = {
  name: 'Bun',
  description: 'Fast JavaScript runtime & all-in-one toolkit',
  category: 'JavaScript',
  profiles: ['backend', 'frontend'],
  checkCommand: 'which bun',
  command: 'curl -fsSL https://bun.sh/install | bash',
  requiresReload: true,
  dependencies: ['Volta', 'Node.js LTS'],
};

// ── Containers ────────────────────────────────────────────

const docker: Package = {
  name: 'Docker',
  description: 'Container platform with Compose & BuildKit',
  category: 'Containers',
  profiles: ['backend', 'devops'],
  checkCommand: 'which docker',
  command: [
    'sudo apt-get update',
    'sudo apt-get install -y ca-certificates curl',
    'sudo install -m 0755 -d /etc/apt/keyrings',
    'sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc',
    'sudo chmod a+r /etc/apt/keyrings/docker.asc',
    'echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null',
    'sudo apt-get update',
    'sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin',
    'sudo usermod -aG docker $USER',
  ].join(' && \\\n'),
  postInstall: 'Log out and back in to use Docker without sudo',
  requiresReload: true,
};

// ── Cloud & DevOps ────────────────────────────────────────

const githubCli: Package = {
  name: 'GitHub CLI',
  description: "GitHub's official command-line tool",
  category: 'Cloud & DevOps',
  profiles: ['backend', 'frontend', 'devops'],
  checkCommand: 'which gh',
  command: [
    '(type -p wget >/dev/null || (sudo apt-get update && sudo apt-get install -y wget))',
    'sudo mkdir -p -m 755 /etc/apt/keyrings',
    'wget -qO- https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null',
    'sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg',
    'echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null',
    'sudo apt-get update',
    'sudo apt-get install -y gh',
  ].join(' && \\\n'),
};

const gcloud: Package = {
  name: 'Google Cloud SDK',
  description: 'CLI tools for Google Cloud Platform',
  category: 'Cloud & DevOps',
  profiles: ['backend', 'devops', 'data'],
  checkCommand: 'which gcloud || [ -d "$HOME/google-cloud-sdk" ]',
  command: [
    'curl -fL "https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-linux-x86_64.tar.gz" -o /tmp/google-cloud-cli.tar.gz',
    'tar -xf /tmp/google-cloud-cli.tar.gz -C "$HOME"',
    '"$HOME/google-cloud-sdk/install.sh" --quiet --path-update=true',
    'rm /tmp/google-cloud-cli.tar.gz',
  ].join(' && \\\n'),
  postInstall: 'Run: gcloud init  to configure your account',
  requiresReload: true,
};

const kubectl: Package = {
  name: 'kubectl',
  description: 'Kubernetes command-line tool',
  category: 'Cloud & DevOps',
  profiles: ['devops'],
  checkCommand: 'which kubectl',
  command: [
    'sudo apt-get update',
    'sudo apt-get install -y apt-transport-https ca-certificates curl gnupg',
    'curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.29/deb/Release.key | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg',
    'sudo chmod 644 /etc/apt/keyrings/kubernetes-apt-keyring.gpg',
    "echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.29/deb/ /' | sudo tee /etc/apt/sources.list.d/kubernetes.list",
    'sudo chmod 644 /etc/apt/sources.list.d/kubernetes.list',
    'sudo apt-get update',
    'sudo apt-get install -y kubectl',
  ].join(' && \\\n'),
};

// ── AI CLIs ───────────────────────────────────────────────

const claudeCode: Package = {
  name: 'Claude Code',
  description: "Anthropic's agentic coding CLI",
  category: 'AI CLIs',
  checkCommand: 'which claude',
  command: 'npm install -g @anthropic-ai/claude-code',
  postInstall: 'Run: claude  to start. Requires npm (Node.js) to install.',
};

const githubCopilotCli: Package = {
  name: 'GitHub Copilot CLI',
  description: 'AI pair programmer as a gh extension',
  category: 'AI CLIs',
  checkCommand: "gh extension list 2>/dev/null | grep -q 'copilot'",
  command: 'gh extension install github/gh-copilot',
  postInstall: 'Run: gh copilot suggest "<what you want to do>"',
  dependencies: ['GitHub CLI'],
};

const codex: Package = {
  name: 'OpenAI Codex CLI',
  description: 'OpenAI coding agent in the terminal',
  category: 'AI CLIs',
  checkCommand: 'which codex',
  command: 'curl -fsSL https://chatgpt.com/codex/install.sh | sh',
  postInstall: 'Run: codex  to start. Authenticate with your OpenAI account.',
};

const geminiCli: Package = {
  name: 'Gemini CLI',
  description: "Google's AI coding assistant CLI",
  category: 'AI CLIs',
  checkCommand: 'which gemini',
  command: 'npm install -g @google/gemini-cli',
  postInstall: 'Run: gemini  to start. Requires npm (Node.js) to install.',
};

// ── All packages (ordered) ────────────────────────────────

const packages: Package[] = [
  // Shell
  zsh,
  ohMyZsh,
  starship,
  // Development
  buildEssentials,
  python3,
  pyenv,
  golang,
  // JavaScript
  volta,
  nodejs,
  bun,
  // Containers
  docker,
  // Cloud & DevOps
  githubCli,
  gcloud,
  kubectl,
  // AI CLIs
  claudeCode,
  githubCopilotCli,
  codex,
  geminiCli,
];

export default packages;
