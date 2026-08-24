import { Component } from 'react'
import { AlertTriangle } from 'lucide-react'
import { withTranslation } from 'react-i18next'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled React error:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      const { t } = this.props
      return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4 font-inter">
          <div className="w-full max-w-md bg-surface border border-outline-variant rounded-xl shadow-ambient p-8 text-center flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-error-container text-error flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex flex-col gap-2">
              <h1 className="text-headline-md font-semibold text-on-surface">{t('somethingWentWrong')}</h1>
              <p className="text-body-md text-on-surface-variant">
                {t('errorSafeState')}
              </p>
            </div>
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary text-on-primary text-label-md font-semibold hover:bg-primary-container transition-colors"
            >
              {t('reloadPage')}
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default withTranslation('common')(ErrorBoundary)
