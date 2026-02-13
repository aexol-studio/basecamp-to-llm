# Contributing to @aexol-studio/basecamp-to-llm

Thank you for your interest in contributing to this project! This document provides guidelines and information for contributors.

## Development Setup

1. **Fork and clone the repository**

   ```bash
   git clone https://github.com/your-username/basecamp-to-llm.git
   cd basecamp-to-llm
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file or set the required environment variables:

   ```bash
   export BASECAMP_CLIENT_ID="your_client_id"
   export BASECAMP_CLIENT_SECRET="your_client_secret"
   export BASECAMP_REDIRECT_URI="http://localhost:8787/callback"
   export BASECAMP_USER_AGENT="Your App Name (your@email.com)"
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

## Available Scripts

- `npm run build` - Build the TypeScript project
- `npm run dev` - Development mode with watch
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run clean` - Clean build artifacts

## Code Style

This project uses:

- **TypeScript** for type safety
- **ESLint** for code linting
- **Prettier** for code formatting
- **Jest** for testing

Please ensure your code follows the established patterns and passes all linting and formatting checks.

## Testing

- Write tests for new features
- Ensure all existing tests pass
- Run `npm test` before submitting a PR

## Submitting Changes

1. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write your code
   - Add tests if applicable
   - Update documentation if needed

3. **Run quality checks**

   ```bash
   npm run lint
   npm run format:check
   npm test
   npm run build
   ```

4. **Commit your changes**

   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. **Push and create a Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```

## Commit Message Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

## Pull Request Guidelines

- Provide a clear description of the changes
- Include any relevant issue numbers
- Ensure all CI checks pass
- Update documentation if needed
- Add tests for new functionality

## Getting Help

If you need help or have questions:

- Open an issue on GitHub
- Check existing issues and discussions
- Review the documentation

Thank you for contributing! 🎉
