import { ArrowUp, ArrowUpDown, ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatUsd } from './benchmarkData.js';
import { familyVisual } from './chartModel.js';
import { benchmarkScope } from './benchmarkScope.js';
import { isRankedRow, rankingRows, sortRankingRows } from './rankingModel.js';

const allColumns = [
  { key: 'rank', label: 'Rank', direction: 'asc' },
  { key: 'model', label: 'Model', direction: 'asc' },
  { key: 'score', label: 'TypeScribe', direction: 'desc' },
  { key: 'wer', label: 'WER', direction: 'asc' },
  { key: 'quality', label: 'Quality', direction: 'desc' },
  { key: 'gates', label: 'Gates', direction: 'desc' },
  { key: 'english', label: 'English', direction: 'desc' },
  { key: 'swahili', label: 'SW-EN', direction: 'desc' },
  { key: 'price', label: 'Price / 30 min', direction: 'asc' },
];

function decimal(value, suffix = '') {
  return value === null ? '—' : `${value.toFixed(1)}${suffix}`;
}

function ModelRow({ row, models, sortedKey, scope }) {
  const visual = familyVisual(row.model, models);
  const ranked = isRankedRow(row);
  const sortedClass = (key) => sortedKey === key ? 'is-sorted-column' : '';

  return (
    <tr className={`${ranked ? 'is-ranked' : 'is-unranked'} ${row.rank === 1 ? 'is-winner' : ''}`} style={{ '--family-color': visual.color }}>
      <td className={`ranking-rank-cell ${sortedClass('rank')}`}>{ranked ? <strong>#{row.rank}</strong> : <span>—</span>}</td>
      <th className={`ranking-model-cell ${sortedClass('model')}`} scope="row">
        <span className="ranking-model-content">
          <i aria-hidden="true" />
          <span><strong>{row.model.label}</strong><small>{row.model.provider} · {row.model.policy === 'probe' ? (row.english !== null ? 'Full English · SW-EN probe' : 'SW-EN probe only') : row.model.apiModel}</small></span>
        </span>
      </th>
      <td className={`ranking-score-cell ${sortedClass('score')}`}>
        {ranked ? (
          <span className="ranking-score-bar" style={{ '--score-width': `${row.score}%` }}>
            <i aria-hidden="true" />
            <strong>{row.score.toFixed(1)}</strong>
            {row.confidenceLow !== null && row.confidenceHigh !== null && <small>95% CI {row.confidenceLow.toFixed(1)}–{row.confidenceHigh.toFixed(1)}</small>}
          </span>
        ) : <span className="ranking-status">Not ranked</span>}
      </td>
      <td className={sortedClass('wer')}>{decimal(row.wer, '%')}</td>
      <td className={sortedClass('quality')}>{decimal(row.quality)}</td>
      <td className={sortedClass('gates')}>{decimal(row.gates, '%')}</td>
      {scope !== 'sw-en' && <td className={sortedClass('english')}>{decimal(row.english, '%')}</td>}
      {scope !== 'english' && <td className={sortedClass('swahili')}>{decimal(row.swahili, '%')}</td>}
      <td className={sortedClass('price')}>{formatUsd(row.price)}</td>
    </tr>
  );
}

export function BenchmarkRankingTable({ models, scope = 'all' }) {
  const [open, setOpen] = useState(true);
  const [sortState, setSort] = useState({ key: 'rank', direction: 'asc' });
  const columns = allColumns.filter((column) => !(scope === 'english' && column.key === 'swahili') && !(scope === 'sw-en' && column.key === 'english'));
  const sort = columns.some((column) => column.key === sortState.key) ? sortState : { key: 'rank', direction: 'asc' };
  const scopeLabel = benchmarkScope(scope).label;
  const rows = useMemo(() => rankingRows(models), [models]);
  const ranked = useMemo(
    () => sortRankingRows(rows.filter(isRankedRow), sort.key, sort.direction),
    [rows, sort],
  );
  const unranked = useMemo(
    () => sortRankingRows(rows.filter((row) => !isRankedRow(row)), 'model', 'asc'),
    [rows],
  );

  const changeSort = (column) => {
    setSort((current) => current.key === column.key
      ? { key: column.key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
      : { key: column.key, direction: column.direction });
  };

  return (
    <section className="ranking-table-section" aria-labelledby="ranking-table-title">
      <button className="ranking-table-toggle" type="button" aria-label={open ? 'Hide ranked results table' : 'Show ranked results table'} aria-expanded={open} aria-controls="ranking-table-panel" onClick={() => setOpen((current) => !current)}>
        <span>
          <strong id="ranking-table-title">{scope === 'all' ? 'Ranked results' : `${scopeLabel} ranked results`}</strong>
          <small>{ranked.length} ranked models · {unranked.length} unranked {unranked.length === 1 ? 'model' : 'models'} listed separately</small>
        </span>
        <span className="ranking-table-toggle-action">{open ? 'Hide table' : 'Show table'}<ChevronDown className={open ? 'is-open' : ''} size={16} /></span>
      </button>

      <div className={`ranking-table-disclosure ${open ? 'is-open' : ''}`} aria-hidden={!open} inert={open ? undefined : true}>
        <div className="ranking-table-clip">
          <div className="ranking-table-panel" id="ranking-table-panel">
            <div className="ranking-table-scroll" tabIndex={0} aria-label="Scrollable benchmark ranking table">
              <table>
                <caption className="sr-only">TypeScribe benchmark models ranked by the published {scope === 'all' ? 'combined' : scopeLabel} TypeScribe score. Select a column heading to change the table order.</caption>
                <thead>
                  <tr>
                    {columns.map((column) => {
                      const active = sort.key === column.key;
                      const nextDirection = active && sort.direction === 'asc' ? 'descending' : active ? 'ascending' : column.direction === 'asc' ? 'ascending' : 'descending';
                      return (
                        <th aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined} scope="col" className={active ? 'is-sorted-column' : ''} key={column.key}>
                          <button type="button" onClick={() => changeSort(column)} aria-label={`Sort by ${column.label} ${nextDirection}`}>
                            {column.label}
                            {active ? <ArrowUp className={sort.direction === 'desc' ? 'is-descending' : ''} size={13} /> : <ArrowUpDown size={13} />}
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((row) => <ModelRow row={row} models={models} sortedKey={sort.key} scope={scope} key={row.model.id} />)}
                </tbody>
                {unranked.length > 0 && (
                  <tbody className="ranking-unranked-group">
                    <tr className="ranking-group-label"><th colSpan={columns.length} scope="rowgroup">{scope === 'all' ? 'Not ranked · no eligible full result on both tracks' : `Not ranked · no full ${scopeLabel} score`}</th></tr>
                    {unranked.map((row) => <ModelRow row={row} models={models} sortedKey={sort.key} scope={scope} key={row.model.id} />)}
                  </tbody>
                )}
              </table>
            </div>
            <p className="ranking-table-note">Published ranks preserve paired-bootstrap ties. {scope === 'all' ? 'English-only rows show full-track accuracy; their Swahili-English probes are not scored.' : `${scopeLabel} scores and ranks use that complete track only. Swahili eligibility does not restrict English results.`} Lower WER and price are better; all other scored metrics are higher is better.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
