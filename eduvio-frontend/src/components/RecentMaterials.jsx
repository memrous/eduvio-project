import { ExternalLink, Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import pdfIcon from '../assets/icons/pdf.png'
import bookIcon from '../assets/icons/book.png'
import imageIcon from '../assets/icons/image.png'
import fileIcon from '../assets/icons/file.png'
import folderIcon from '../assets/icons/folder.png'
import CustomIcon from './CustomIcon'

const MATERIAL_ICONS = {
  PDF: pdfIcon,
  NOTES: bookIcon,
  SLIDES: imageIcon,
  LINK: folderIcon,
  default: fileIcon,
}

const MaterialTypeIcon = ({ type, className = 'w-5 h-5' }) => (
  <img
    src={MATERIAL_ICONS[type] || MATERIAL_ICONS.default}
    alt=""
    aria-hidden="true"
    className={`${className} object-contain`}
  />
)

const getResourceTypeStyles = (type, t) => {
  switch (type) {
    case 'PDF': return { bg: 'bg-error-container text-error', label: t('recentMaterials.resourceTypes.PDF') };
    case 'SLIDES': return { bg: 'bg-primary-container text-primary', label: t('recentMaterials.resourceTypes.SLIDES') };
    case 'LINK': return { bg: 'bg-success-container text-success', label: t('recentMaterials.resourceTypes.LINK') };
    case 'NOTES': return { bg: 'bg-secondary-container text-secondary', label: t('recentMaterials.resourceTypes.NOTES') };
    default: return { bg: 'bg-surface-container-low text-on-surface-variant', label: t('recentMaterials.resourceTypes.default') };
  }
};

const RecentMaterials = ({ resources, subjects }) => {
  const { t } = useTranslation('dashboard')
  // Desktop materials (up to 3)
  const recentListDesktop = [...(resources || [])]
    .sort((a, b) => (b.uploadedAt || '').localeCompare(a.uploadedAt || ''))
    .slice(0, 3);

  // Mobile materials (up to 2)
  const recentListMobile = [...(resources || [])]
    .sort((a, b) => (b.uploadedAt || '').localeCompare(a.uploadedAt || ''))
    .slice(0, 2);

  return (
    <>
      {/* MOBILE LAYOUT: Recent Materials */}
      <section className="flex lg:hidden flex-col gap-3 font-inter text-on-surface">
        <h3 className="text-headline-md font-semibold">{t('recentMaterials.title')}</h3>
        
        <div className="flex flex-col gap-3">
          {recentListMobile.length === 0 ? (
            <div className="bg-surface border border-outline-variant p-4 rounded-lg text-center text-body-md text-on-surface-variant italic">
              {t('recentMaterials.noResources')}
            </div>
          ) : (
            recentListMobile.map(res => {
              const subject = (subjects || []).find(s => s.id === res.subjectId);
              const subCode = subject ? subject.code : '';
              const styles = getResourceTypeStyles(res.type, t);
              const isExternal = res.type === 'LINK';

              return (
                <div 
                  key={res.id} 
                  className="bg-surface border border-outline-variant p-4 rounded-lg shadow-ambient flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-10 h-10 ${styles.bg} flex items-center justify-center rounded-md shrink-0`}>
                      <MaterialTypeIcon type={res.type} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-label-md font-semibold truncate" title={res.title}>
                        {res.title}
                      </h4>
                      <span className="text-label-sm text-on-surface-variant block mt-0.5 truncate">
                        {subCode} • {styles.label}
                      </span>
                    </div>
                  </div>
                  
                  <a 
                    href={res.url}
                    target={isExternal ? '_blank' : '_self'}
                    rel="noreferrer"
                    className="p-2 border border-outline-variant hover:bg-surface-container rounded-sm text-on-surface-variant hover:text-on-surface shrink-0 transition-colors cursor-pointer ml-2 animate-none"
                  >
                    {isExternal ? <ExternalLink className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                  </a>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* DESKTOP LAYOUT: Recent Materials */}
      <div className="hidden lg:flex bg-surface border border-outline-variant p-5 rounded-lg shadow-ambient flex-col gap-4 relative font-inter text-on-surface">
        <div className="flex items-center gap-2">
          <CustomIcon name="folder" className="w-5 h-5" />
          <h2 className="text-headline-md font-semibold">{t('recentMaterials.title')}</h2>
        </div>

        <div className="flex flex-col gap-3">
          {recentListDesktop.length === 0 ? (
            <p className="text-body-md text-on-surface-variant italic text-center py-2">{t('recentMaterials.noResources')}</p>
          ) : (
            recentListDesktop.map(res => {
              const subject = (subjects || []).find(s => s.id === res.subjectId);
              const subName = subject ? subject.name : '';
              const styles = getResourceTypeStyles(res.type, t);
              const isExternal = res.type === 'LINK';

              return (
                <a 
                  key={res.id} 
                  href={res.url} 
                  target={isExternal ? '_blank' : '_self'}
                  rel="noreferrer"
                  className="flex items-center gap-3 p-3 bg-surface rounded-md border border-outline-variant hover:bg-surface-container transition-colors cursor-pointer"
                >
                  <div className={`w-9 h-9 ${styles.bg} flex items-center justify-center rounded-md shrink-0`}>
                    <MaterialTypeIcon type={res.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-label-md font-semibold truncate" title={res.title}>
                      {res.title}
                    </h4>
                    <span className="text-label-sm text-on-surface-variant">
                      {res.size || t('recentMaterials.attachment')} • {styles.label} {subName && `• ${subName}`}
                    </span>
                  </div>
                </a>
              );
            })
          )}
        </div>
      </div>
    </>
  )
}

export default RecentMaterials
