import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import { Button, Card } from '../shared'

function ToggleButton ({ active, children, onClick }) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
        active
          ? 'border-primary bg-primary text-white shadow-soft'
          : 'border-border bg-background-subtle text-foreground hover:border-primary/60'
      }`}
    >
      {children}
    </button>
  )
}

ToggleButton.propTypes = {
  active: PropTypes.bool,
  children: PropTypes.node,
  onClick: PropTypes.func
}

function CheckboxRow ({ label, description, disabled, checked, onChange }) {
  return (
    <label
      className={`flex cursor-pointer flex-col gap-1 rounded-2xl border px-4 py-3 text-sm transition ${
        disabled ? 'border-border/60 bg-background-subtle text-foreground-muted' : 'border-border bg-background text-foreground hover:border-primary/60'
      }`}
    >
      <div className='flex items-center gap-3'>
        <input
          type='checkbox'
          className='h-4 w-4 rounded border-border text-primary focus:ring-primary'
          disabled={disabled}
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className='font-semibold'>{label}</span>
      </div>
      {description ? <p className='pl-7 text-xs text-foreground-muted'>{description}</p> : null}
    </label>
  )
}

CheckboxRow.propTypes = {
  label: PropTypes.string.isRequired,
  description: PropTypes.string,
  disabled: PropTypes.bool,
  checked: PropTypes.bool,
  onChange: PropTypes.func
}

export default function PostInteractionSettingsModal ({
  open,
  t,
  draft,
  loading,
  saving,
  error,
  lists,
  onClose,
  onDraftChange,
  onLoadLists,
  onSave
}) {
  const [listOpen, setListOpen] = useState(false)
  const isLimited = draft.replyMode === 'limited'

  useEffect(() => {
    if (!open) {
      setListOpen(false)
    }
  }, [open])

  useEffect(() => {
    if (open && listOpen && typeof onLoadLists === 'function' && !lists.loaded && !lists.loading) {
      onLoadLists()
    }
  }, [open, listOpen, onLoadLists, lists.loaded, lists.loading])

  if (!open) return null

  const content = (
    <div className='fixed inset-0 z-50 flex items-center justify-center'>
      <div className='absolute inset-0 bg-black/40 backdrop-blur-sm' aria-hidden='true' />
      <Card
        as='div'
        padding='p-6'
        className='relative z-50 w-[min(560px,92vw)] max-h-[90vh] overflow-y-auto rounded-3xl shadow-card'
      >
        <div className='space-y-2'>
          <h3 className='text-lg font-semibold'>{t('compose.interactions.title', 'Post-Interaktionseinstellungen')}</h3>
          <p className='text-sm text-foreground-muted'>
            {t('compose.interactions.subtitle', 'Bestimme, wer antworten oder zitieren darf.')}
          </p>
          {error ? <p className='text-sm text-destructive'>{error}</p> : null}
        </div>

        <div className='mt-5 space-y-4'>
          <div>
            <p className='mb-2 text-xs uppercase tracking-[0.2em] text-foreground-muted'>
              {t('compose.interactions.replyHeading', 'Wer kann antworten')}
            </p>
            <div className='flex flex-wrap gap-3'>
              <ToggleButton
                active={!isLimited}
                onClick={() => onDraftChange({ ...draft, replyMode: 'everyone' })}
              >
                {t('compose.interactions.option.everyone', 'Jeder')}
              </ToggleButton>
              <ToggleButton
                active={isLimited}
                onClick={() => onDraftChange({ ...draft, replyMode: 'limited' })}
              >
                {t('compose.interactions.option.limited', 'Nur ausgewählte Gruppen')}
              </ToggleButton>
            </div>
          </div>

          <div className='space-y-3'>
            <CheckboxRow
              label={t('compose.interactions.checkbox.followers', 'Deine Follower')}
              description={t('compose.interactions.checkbox.followers.desc', 'Accounts, die dir folgen.')}
              disabled={!isLimited}
              checked={draft.allowFollowers}
              onChange={(checked) => onDraftChange({ ...draft, replyMode: 'limited', allowFollowers: checked })}
            />
            <CheckboxRow
              label={t('compose.interactions.checkbox.following', 'Personen, denen du folgst')}
              description={t('compose.interactions.checkbox.following.desc', 'Erhalte Antworten aus deinem Feed.')}
              disabled={!isLimited}
              checked={draft.allowFollowing}
              onChange={(checked) => onDraftChange({ ...draft, replyMode: 'limited', allowFollowing: checked })}
            />
            <CheckboxRow
              label={t('compose.interactions.checkbox.mentioned', 'Personen, die du erwähnst')}
              description={t('compose.interactions.checkbox.mentioned.desc', 'Gilt für alle @-Erwähnungen im Post.')}
              disabled={!isLimited}
              checked={draft.allowMentioned}
              onChange={(checked) => onDraftChange({ ...draft, replyMode: 'limited', allowMentioned: checked })}
            />

            <div className={`rounded-2xl border px-4 py-3 ${isLimited ? 'border-border bg-background' : 'border-border/60 bg-background-subtle text-foreground-muted'}`}>
              <button
                type='button'
                className='flex w-full items-center justify-between text-left text-sm font-semibold'
                disabled={!isLimited}
                onClick={() => setListOpen((value) => !value)}
              >
                <span>{t('compose.interactions.checkbox.lists', 'Aus deinen Listen auswählen')}</span>
                <span className='text-lg'>{listOpen ? '▴' : '▾'}</span>
              </button>
              {isLimited ? (
                <div className='mt-3 space-y-2'>
                  {listOpen ? (
                    lists.loading ? (
                      <p className='text-xs text-foreground-muted'>
                        {t('compose.interactions.lists.loading', 'Listen werden geladen…')}
                      </p>
                    ) : lists.error ? (
                      <p className='text-xs text-destructive'>{lists.error}</p>
                    ) : lists.items.length === 0 ? (
                      <p className='text-xs text-foreground-muted'>
                        {t('compose.interactions.lists.empty', 'Du hast noch keine Listen erstellt.')}
                      </p>
                    ) : (
                      <div className='max-h-48 space-y-2 overflow-y-auto pr-1'>
                        {lists.items.map((list) => (
                          <label key={list.uri} className='flex items-center gap-3 text-sm text-foreground'>
                            <input
                              type='checkbox'
                              className='h-4 w-4 rounded border-border text-primary focus:ring-primary'
                              checked={draft.selectedLists.includes(list.uri)}
                              onChange={(event) => {
                                const checked = event.target.checked
                                const filtered = draft.selectedLists.filter((uri) => uri !== list.uri)
                                const selected = checked ? filtered.concat(list.uri) : filtered
                                onDraftChange({ ...draft, replyMode: 'limited', selectedLists: selected })
                              }}
                            />
                            <span>{list.name || list.uri}</span>
                          </label>
                        ))}
                      </div>
                    )
                  ) : (
                    <p className='text-xs text-foreground-muted'>
                      {draft.selectedLists.length > 0
                        ? t('compose.interactions.lists.selected', `${draft.selectedLists.length} Listen ausgewählt`, { count: draft.selectedLists.length })
                        : t('compose.interactions.lists.helper', 'Keine Liste ausgewählt.')}
                    </p>
                  )}
                </div>
              ) : (
                <p className='mt-3 text-xs text-foreground-muted'>
                  {t('compose.interactions.lists.disabled', 'Aktiviere „Nur ausgewählte Gruppen“, um Listen zu verwenden.')}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className='mt-6 space-y-3'>
          <div className='flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3'>
            <div>
              <p className='text-sm font-semibold text-foreground'>{t('compose.interactions.quotes.title', 'Zitieren dieses Posts erlauben')}</p>
              <p className='text-xs text-foreground-muted'>
                {t('compose.interactions.quotes.desc', 'Deaktiviert die Möglichkeit, deinen Post zu zitieren.')}
              </p>
            </div>
            <button
              type='button'
              role='switch'
              aria-checked={draft.allowQuotes}
              onClick={() => onDraftChange({ ...draft, allowQuotes: !draft.allowQuotes })}
              className={`inline-flex h-6 w-11 items-center rounded-full border transition ${
                draft.allowQuotes ? 'border-primary bg-primary' : 'border-border bg-background-subtle'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white transition ${draft.allowQuotes ? 'translate-x-5' : 'translate-x-1'}`}
              />
            </button>
          </div>

          <p className='text-xs text-foreground-muted'>
            {t('compose.interactions.note', 'Diese Auswahl gilt auch zukünftig als Standard.')}
          </p>
        </div>

        <div className='mt-6 flex items-center justify-end gap-3'>
          <Button type='button' variant='secondary' onClick={onClose} disabled={saving}>
            {t('compose.cancel', 'Abbrechen')}
          </Button>
          <Button type='button' variant='primary' onClick={onSave} disabled={saving || loading}>
            {saving ? t('compose.saving', 'Speichere…') : t('compose.save', 'Speichern')}
          </Button>
        </div>
      </Card>
    </div>
  )

  return createPortal(content, document.body)
}

PostInteractionSettingsModal.propTypes = {
  open: PropTypes.bool,
  t: PropTypes.func.isRequired,
  draft: PropTypes.shape({
    replyMode: PropTypes.oneOf(['everyone', 'limited']).isRequired,
    allowFollowers: PropTypes.bool,
    allowFollowing: PropTypes.bool,
    allowMentioned: PropTypes.bool,
    selectedLists: PropTypes.arrayOf(PropTypes.string),
    allowQuotes: PropTypes.bool
  }).isRequired,
  loading: PropTypes.bool,
  saving: PropTypes.bool,
  error: PropTypes.string,
  lists: PropTypes.shape({
    loading: PropTypes.bool,
    error: PropTypes.string,
    loaded: PropTypes.bool,
    items: PropTypes.arrayOf(
      PropTypes.shape({
        uri: PropTypes.string.isRequired,
        name: PropTypes.string
      })
    )
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onDraftChange: PropTypes.func.isRequired,
  onLoadLists: PropTypes.func,
  onSave: PropTypes.func.isRequired
}
