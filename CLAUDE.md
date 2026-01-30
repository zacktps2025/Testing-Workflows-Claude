# CLAUDE.md - AI Assistant Guidelines

This file provides context and guidelines for AI assistants (like Claude) working with this repository.

## Repository Overview

**Repository:** Testing-Workflows-Claude
**Purpose:** Testing and validating Claude AI workflows, automation, and integration patterns
**Status:** Initial setup

## Project Structure

```
Testing-Workflows-Claude/
├── CLAUDE.md          # AI assistant guidelines (this file)
├── README.md          # Project documentation (to be created)
├── src/               # Source code (to be created)
├── tests/             # Test files (to be created)
└── .github/           # GitHub workflows and CI/CD (to be created)
```

## Development Guidelines

### Git Workflow

1. **Branch Naming:** Use descriptive branch names with prefixes:
   - `feature/` - New features
   - `fix/` - Bug fixes
   - `docs/` - Documentation updates
   - `test/` - Test additions/modifications
   - `claude/` - Claude AI-generated branches

2. **Commit Messages:** Follow conventional commits:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `test:` - Test changes
   - `chore:` - Maintenance tasks
   - `refactor:` - Code refactoring

3. **Pull Requests:** Include clear descriptions of changes and link related issues

### Code Standards

- Write clean, readable, and well-documented code
- Follow language-specific best practices and style guides
- Include appropriate error handling
- Add tests for new functionality

### Testing

- Write unit tests for all new features
- Ensure all tests pass before committing
- Aim for meaningful test coverage

## AI Assistant Instructions

### When Working on This Repository

1. **Always read relevant files** before making changes
2. **Use the TodoWrite tool** to plan and track multi-step tasks
3. **Commit frequently** with clear, descriptive messages
4. **Run tests** after making changes when applicable
5. **Follow existing patterns** and conventions in the codebase

### Prohibited Actions

- Do not commit sensitive information (API keys, credentials, etc.)
- Do not force push to main/master branches
- Do not make changes without understanding the context
- Do not skip tests or validation steps

### Best Practices

- Keep changes focused and atomic
- Document complex logic with comments
- Prefer editing existing files over creating new ones
- Ask for clarification when requirements are ambiguous

## Commands Reference

### Development Commands (To Be Configured)

```bash
# Install dependencies
npm install  # or yarn install, pip install, etc.

# Run tests
npm test     # or equivalent

# Build project
npm run build  # or equivalent

# Start development server
npm run dev    # or equivalent
```

## Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Node.js dependencies and scripts (if applicable) |
| `tsconfig.json` | TypeScript configuration (if applicable) |
| `.eslintrc` | ESLint configuration (if applicable) |
| `.prettierrc` | Prettier configuration (if applicable) |
| `.github/workflows/` | CI/CD pipeline definitions |

## Contact & Resources

- **Repository Issues:** Report bugs and feature requests via GitHub Issues
- **Documentation:** See README.md for detailed project documentation

---

*Last updated: 2026-01-30*
