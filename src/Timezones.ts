import { getTimeZones, rawTimeZones, TimeZone } from '@vvo/tzdb'
import { getLocalizedDateTime, getOffsetString } from './utils/date'
import { abbreviations } from './data/abbreviations'
import { timezoneAliases } from './data/aliases'

const getUserCountryCode = (): string => {
  if (typeof navigator === 'undefined' || !navigator) {
    return ''
  }
  const locale = navigator.language || navigator.languages?.[0]
  return locale?.split('-')?.[1]?.toUpperCase() || ''
}

const isUnknownTimeZone = (tzCode: string) => !tzCode || tzCode === 'Etc/Unknown' 

interface ITimezone {
  code: string
  label: string
  shortLabel: string
  abbreviation: string
  offset: number
  offsetString: string
  countryCode: string | null
  searchText: string
  group: string[]
}

export class Timezones {
  public static instance: Timezones

  public static init() {
    if (!Timezones.instance) {
      Timezones.instance = new Timezones()
      Timezones.instance.processTimezones()
    }
  }

  private timezones: ITimezone[] = []

  private getTimezoneList(): Array<TimeZone> {
    const dbTimezones = getTimeZones({ includeUtc: true })
    return [
      ...dbTimezones,
      ...this.generateMissingTimezones(dbTimezones),
      ...this.generateEtcTimezones()
    ].sort((tzA, tzB) => tzA.currentTimeOffsetInMinutes - tzB.currentTimeOffsetInMinutes)
  }

  private generateEtcTimezones(): Array<TimeZone> {
    const hours = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    return [...hours.concat(13, 14).map(hour => -hour), ...hours].map((hourOffset) => {
      const code = `Etc/GMT${hourOffset > 0 ? '+' : ''}${hourOffset}`
      const invertedSign = hourOffset > 0 ? '-' : '+'
      const absHourOffset = Math.abs(hourOffset)
      const codeLabel = `${invertedSign}${('0' + absHourOffset).slice(-2)}:00`
      const luxonDateTime = getLocalizedDateTime(new Date(), code)
      return {
        name: code,
        alternativeName: `Coordinated Universal Time ${invertedSign}${absHourOffset}`,
        group: [],
        continentCode: '',
        continentName: '',
        countryName: '',
        countryCode: '',
        mainCities: [],
        rawOffsetInMinutes: luxonDateTime.offset,
        abbreviation: '',
        rawFormat: `${codeLabel} Coordinated Universal Time ${invertedSign}${absHourOffset}`,
        currentTimeOffsetInMinutes: luxonDateTime.offset,
        currentTimeFormat: `${codeLabel} Coordinated Universal Time ${invertedSign}${absHourOffset}`
      }
    })
  }

  private generateMissingTimezones(dbTimezones: Array<TimeZone>): Array<TimeZone> {
    const missingTimezones = []
    const dbTimezoneByCode = dbTimezones.reduce((acc, tz) => {
      acc[tz.name] = tz
      return acc
    }, {})
    rawTimeZones.forEach((rawTimeZone) => {
      if (!dbTimezoneByCode[rawTimeZone.name]) {
        // missing timezone, attempt to find a backwards-compatible alias
        const aliasTzCode = timezoneAliases[rawTimeZone.name]
        if (aliasTzCode) {
          try {
            new Intl.DateTimeFormat('en-US', { timeZone: aliasTzCode })
            const luxonDateTime = getLocalizedDateTime(new Date(), aliasTzCode)
            const timeZone: Partial<TimeZone> = {
              ...rawTimeZone,
              currentTimeOffsetInMinutes: luxonDateTime.offset
            }
            const offsetInHours = getOffsetString(timeZone.currentTimeOffsetInMinutes)
            timeZone.currentTimeFormat = `${offsetInHours.padStart(6, "+")} ${rawTimeZone.alternativeName} - ${rawTimeZone.mainCities.join(", ")}`
            missingTimezones.push(timeZone)
          } catch (_) {
            console.log(`Missing timezone: ${rawTimeZone.name}`)
          }
        }
      }
    })
    return missingTimezones
  }

  private processTimezones(): void {
    return this.getTimezoneList().forEach((tz) => {
      const luxonDateTime = getLocalizedDateTime(new Date(), tz.name)
      const isInDST = luxonDateTime.isInDST
      // generate abbreviation
      const dstAbbreviation = abbreviations[tz.name]?.dst || ''
      const defaultAbbreviation = abbreviations[tz.name]?.default || tz.abbreviation || ''
      const abbreviation = (isInDST && dstAbbreviation) || defaultAbbreviation
      // generate labels
      let label = `(GMT${tz.currentTimeFormat.slice(0, 6)}) ${tz.alternativeName}`
      const offsetSign = tz.currentTimeOffsetInMinutes >= 0 ? '+' : '-'
      const absCurrentTimeOffsetInMinutes = Math.abs(tz.currentTimeOffsetInMinutes)
      const absOffsetHour = absCurrentTimeOffsetInMinutes / 60
      const offsetHourString = `${offsetSign}${Math.floor(absOffsetHour)}`
      const absOffsetMinute = absCurrentTimeOffsetInMinutes % 60
      const offsetMinuteString = absOffsetMinute > 0 ? `:${absOffsetMinute}` : ''
      let shortLabel = `(GMT${offsetHourString + offsetMinuteString}) ${tz.alternativeName}`
      if (tz.mainCities.filter(Boolean).length > 0) {
        label += ` - ${tz.mainCities.slice(0, 2).join(', ')}`
        shortLabel += ` - ${tz.mainCities.slice(0, 2).join(', ')}`
      }
      if (abbreviation && !['utc', 'israel'].includes(abbreviation.toLowerCase())) {
        label += ` - ${abbreviation.toUpperCase()}`
        shortLabel += ` - ${abbreviation.toUpperCase()}`
      }
      // generate search query string
      const partsToSearch = [
        tz.name,
        tz.currentTimeFormat,
        tz.alternativeName,
        dstAbbreviation,
        defaultAbbreviation,
        tz.countryName,
        tz.continentName,
        ...(tz.mainCities ?? [])
      ]
      this.timezones.push({
        code: tz.name,
        label,
        shortLabel,
        abbreviation,
        offset: tz.currentTimeOffsetInMinutes,
        offsetString: `GMT${offsetHourString + offsetMinuteString}`,
        countryCode: tz.countryCode || null,
        searchText: partsToSearch.join(' ').toLowerCase(),
        group: tz.group
      })
    })
  }

  /**
   * Returns the timezones list
   */
  public getTimezones() {
    return this.timezones
  }

  public getTimezoneByCode(code: string) {
    return this.timezones.find((tz) => code === tz.code || tz.group.includes(code) || tz.code === timezoneAliases[code])
  }

  /**
   * Returns the timezones list as select options
   */
  public getTimezoneOptions() {
    return this.timezones.map((timezone) => {
      return {
        id: timezone.code,
        value: timezone.code,
        label: timezone.shortLabel,
        searchText: timezone.searchText
      }
    })
  }

  /**
   * Returns the system timezone code
   */
  public getSystemTimezoneCode() {
    let tzCode: string
    if (typeof Intl === 'object' && !!Intl && typeof Intl.DateTimeFormat === 'function') {
      tzCode = Intl.DateTimeFormat().resolvedOptions().timeZone
    }
    if (isUnknownTimeZone(tzCode)) {
      const dateRef = new Date()
      const userCountryCode = getUserCountryCode()
      const shortTimezoneName = dateRef
        .toLocaleString('en', { day: 'numeric', timeZoneName: 'shortGeneric' })
        .replace(`${dateRef.getDate()}, `, '')
      const longTimezoneName = dateRef
        .toLocaleString('en', { day: 'numeric', timeZoneName: 'longGeneric' })
        .replace(`${dateRef.getDate()}, `, '')
      const sameOffsetTimezones = this.getTimezones()
        .filter(tz => tz.offset === -dateRef.getTimezoneOffset())
        .sort((tzA, tzB) =>{
          if (!userCountryCode) {
            return 0
          }
          const tzACountryCode = tzA.countryCode || ''
          const tzBCountryCode = tzB.countryCode || ''
          if (tzACountryCode === userCountryCode) {
            return -1
          }
          if (tzBCountryCode === userCountryCode) {
            return 1
          }
          return 0
        })
      if (!sameOffsetTimezones.length) {
        return tzCode
      }
      const searchPatterns: Array<(tz: ITimezone) => boolean> = [
        (tz) => tz.label.toLowerCase().includes(shortTimezoneName.toLowerCase()),
        (tz) => tz.searchText.toLowerCase().includes(shortTimezoneName.replace(/(\s+)?time(\s+)?/i, '').toLowerCase()),
        (tz) => tz.label.toLowerCase().includes(longTimezoneName.toLowerCase()),
        (tz) => tz.searchText.toLowerCase().includes(longTimezoneName.replace(/(\s+)?time(\s+)?/i, '').toLowerCase()),
      ]
      for (const pattern of searchPatterns) {
        const matches = sameOffsetTimezones.filter(pattern).sort((tzA, tzB) => tzB.group.length > tzA.group.length ? 1 : -1)
        const foundTzCode = matches.length > 0 ? matches[0].code : ''
        if (!isUnknownTimeZone(foundTzCode)) {
          tzCode = foundTzCode
          break
        }
      }
    }
    return tzCode
  }

  /**
   * Returns the system timezone from the timezones list
   */
  public getSystemTimezone() {
    const systemTimezoneCode = this.getSystemTimezoneCode()
    return this.timezones.find((tz) => tz.code === systemTimezoneCode || tz.group.includes(systemTimezoneCode) || tz.code === timezoneAliases[systemTimezoneCode])
  }
}
